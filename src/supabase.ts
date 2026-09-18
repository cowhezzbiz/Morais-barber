import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://croscmpnezlixszygyka.supabase.co'
const supabaseKey = 'sb_publishable_d9CrR3hifPbk1LTDyP-8Vw_76VPNx2s'

export const supabase = createClient(supabaseUrl, supabaseKey)
