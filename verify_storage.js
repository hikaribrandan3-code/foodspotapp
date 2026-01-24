import { supabase } from './src/lib/supabaseClient.js'

async function checkBucket() {
    console.log('Checking menu-images bucket...')
    try {
        const { data, error } = await supabase.storage.getBucket('menu-images')

        if (error) {
            console.error('❌ Error getting bucket:', error.message)
            if (error.message.includes('not found')) {
                console.log('💡 Attempting to create bucket...')
                const { data: createData, error: createError } = await supabase.storage.createBucket('menu-images', {
                    public: true
                })
                if (createError) console.error('❌ Could not create bucket:', createError.message)
                else console.log('✅ Bucket created successfully!')
            }
        } else {
            console.log('✅ Bucket exists:', data)
            console.log('   Public:', data.public)
        }

        // Try listing files to check RLS
        const { data: listData, error: listError } = await supabase.storage.from('menu-images').list()
        if (listError) console.error('❌ Error listing files (RLS?):', listError.message)
        else console.log('✅ Can list files. Count:', listData.length)

        // TEST UPLOAD
        console.log('⚡ Testing Write Access...')
        const testBlob = new Blob(['Cloud Solder Test'], { type: 'text/plain' })
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('menu-images')
            .upload('solder_test.txt', testBlob, { upsert: true })

        if (uploadError) console.error('❌ Upload Failed:', uploadError.message)
        else console.log('✅ WRITE ACCESS CONFIRMED! File uploaded:', uploadData.path)

    } catch (err) {
        console.error('Unexpected error:', err)
    }
}

checkBucket()
