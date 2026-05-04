
export interface Event {
  id: string;
  business_id: string;
  name: string;
  description: string;
  category: string;
  venue_name: string;
  address: string;
  start_date: string;
  end_date: string;
  image_url: string;
  is_free: boolean;
  min_price?: number;
  ticket_tiers: TicketTier[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  capacity: number;
  remaining: number;
  description?: string;
}

export interface TicketOrder {
  id: string;
  event_id: string;
  tier_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  referral_code?: string;
  discount_amount?: number;
}

export interface DigitalTicket {
  id: string;
  order_id: string;
  event_name: string;
  venue_name: string;
  date: string;
  tier_name: string;
  qr_code: string;
  image_url: string;
  table_number?: string;
}
