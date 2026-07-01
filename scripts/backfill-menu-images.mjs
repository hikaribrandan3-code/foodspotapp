/**
 * Multi-tenant backfill: compress existing menu_items images across ALL businesses
 * that were uploaded before processAndStoreImage() started resizing/re-encoding on the way in.
 *
 * Mirrors the same logic as src/utils/imageOptimizer.js (max 1600px, WebP @ 0.8,
 * skip if already under 300KB) but runs server-side via sharp instead of canvas.
 *
 * Usage:
 *   node scripts/backfill-menu-images.mjs            # dry run — reports only, writes nothing
 *   node scripts/backfill-menu-images.mjs --execute   # actually uploads + updates rows (ALL tenants)
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_5g4u0yoOlkxcJ-beSRbnWg__eK_bc2E';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MAX_DIMENSION = 1600;
const SKIP_UNDER_BYTES = 300 * 1024;
const BUCKET = 'menu-images';

const EXECUTE = process.argv.includes('--execute');

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function processBusinessImages(businessId, businessName) {
    const { data: items, error } = await supabase
        .from('menu_items')
        .select('id, business_id, name, image_url')
        .eq('business_id', businessId)
        .not('image_url', 'is', null);

    if (error) {
        console.error(`❌ Failed to fetch menu_items for ${businessName}: ${error.message}`);
        return { processed: 0, skipped: 0, totalOriginal: 0, totalCompressed: 0, errors: 0 };
    }

    if (items.length === 0) return { processed: 0, skipped: 0, totalOriginal: 0, totalCompressed: 0, errors: 0 };

    console.log(`\n📦 ${businessName} — ${items.length} items with images`);

    let skipped = 0;
    let processed = 0;
    let totalOriginal = 0;
    let totalCompressed = 0;
    let errors = 0;

    for (const item of items) {
        const url = item.image_url;

        if (!url.includes('/storage/v1/object/public/')) {
            skipped++;
            continue;
        }

        try {
            const res = await fetch(url);
            if (!res.ok) {
                errors++;
                continue;
            }
            const contentType = res.headers.get('content-type') || '';
            const buffer = Buffer.from(await res.arrayBuffer());
            const originalSize = buffer.length;

            if (contentType.includes('gif') || contentType.includes('svg')) {
                skipped++;
                continue;
            }
            if (originalSize < SKIP_UNDER_BYTES) {
                skipped++;
                continue;
            }

            const resized = sharp(buffer).resize(MAX_DIMENSION, MAX_DIMENSION, {
                fit: 'inside',
                withoutEnlargement: true
            });
            const compressed = await resized.webp({ quality: 80 }).toBuffer();

            if (compressed.length >= originalSize) {
                skipped++;
                continue;
            }

            processed++;
            totalOriginal += originalSize;
            totalCompressed += compressed.length;

            console.log(`  ✅ ${item.name} — ${formatSize(originalSize)} → ${formatSize(compressed.length)}`);

            if (EXECUTE) {
                const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET)
                    .upload(filePath, compressed, {
                        contentType: 'image/webp',
                        cacheControl: '31536000',
                        upsert: false
                    });

                if (uploadError) {
                    console.log(`     ❌ upload failed: ${uploadError.message}`);
                    errors++;
                    processed--;
                    continue;
                }

                const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

                const { error: updateError } = await supabase
                    .from('menu_items')
                    .update({ image_url: publicUrl })
                    .eq('id', item.id);

                if (updateError) {
                    console.log(`     ❌ row update failed: ${updateError.message}`);
                    errors++;
                }
            }
        } catch (err) {
            console.log(`  ⚠️  error: ${err.message}`);
            errors++;
        }
    }

    if (processed > 0) {
        console.log(`  → ${processed} compressed, ${formatSize(totalOriginal)} → ${formatSize(totalCompressed)} (${Math.round((1 - totalCompressed / totalOriginal) * 100)}% smaller)`);
    }

    return { processed, skipped, totalOriginal, totalCompressed, errors };
}

async function main() {
    console.log(EXECUTE ? '🚀 LIVE RUN — will upload + update rows across ALL TENANTS' : '🧪 DRY RUN — no writes, report only');

    const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('id, name');

    if (bizError) {
        console.error('❌ Failed to fetch businesses:', bizError.message);
        process.exit(1);
    }

    console.log(`Found ${businesses.length} businesses.\n`);

    let grandProcessed = 0;
    let grandSkipped = 0;
    let grandTotalOriginal = 0;
    let grandTotalCompressed = 0;
    let grandErrors = 0;

    for (const biz of businesses) {
        const { processed, skipped, totalOriginal, totalCompressed, errors } = await processBusinessImages(biz.id, biz.name);
        grandProcessed += processed;
        grandSkipped += skipped;
        grandTotalOriginal += totalOriginal;
        grandTotalCompressed += totalCompressed;
        grandErrors += errors;
    }

    console.log('\n══════════════════════════════════════════');
    console.log(`Total Processed:  ${grandProcessed} images`);
    console.log(`Total Skipped:    ${grandSkipped} images`);
    console.log(`Total Errors:     ${grandErrors}`);
    if (grandProcessed > 0) {
        console.log(`Total Size:       ${formatSize(grandTotalOriginal)} → ${formatSize(grandTotalCompressed)} (${Math.round((1 - grandTotalCompressed / grandTotalOriginal) * 100)}% smaller)`);
    }
    console.log(EXECUTE ? '\n✅ Live run complete.' : '\nThis was a dry run — nothing was uploaded or changed. Re-run with --execute to apply.');
}

main();
