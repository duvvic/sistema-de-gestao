const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncPartners() {
    // 1. Get all clients
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name');

    if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return;
    }

    const mapping = {
        "HUMANA CENTER": ["ArcelorMittal Brasil"],
        "SOFTTEK": ["Klabin", "Toyota"],
        "INTELLIGENZA": ["Latam"],
        "PRIMECONTROL + INFINITY": [],
        "BHRAPE": ["Casas Bahia"],
        "T-SYSTEMS": ["Aena", "B3"],
        "NUMEM": [],
        "TACHYONIX": ["Piracanjuba", "Hidrovias", "Taurus", "Focus", "Fiotec"],
        "SPREAD": ["Usiminas", "Unipar", "Hidrovias", "C6", "NTS"],
        "INCLUSION CLOUD": ["AES Energia"],
        "SEIDOR": ["Formitex"],
        "WAYON": []
    };

    for (const [partnerName, companies] of Object.entries(mapping)) {
        console.log(`Processing Partner: ${partnerName}`);

        // Find or Create Partner
        let partner = clients.find(c => c.name.toUpperCase() === partnerName.toUpperCase());
        let partnerId;

        if (!partner) {
            console.log(`Creating Partner: ${partnerName}`);
            const { data: newPartner, error: createError } = await supabase
                .from('clients')
                .insert({ name: partnerName, tipo: 'parceiro', active: true })
                .select()
                .single();

            if (createError) {
                console.error(`Error creating partner ${partnerName}:`, createError);
                continue;
            }
            partnerId = newPartner.id;
        } else {
            partnerId = partner.id;
            // Update type to partner if it's not
            await supabase.from('clients').update({ tipo: 'parceiro' }).eq('id', partnerId);
        }

        // Link companies
        for (const companyName of companies) {
            let company = clients.find(c => c.name.toUpperCase() === companyName.toUpperCase());

            if (company) {
                console.log(`Linking ${companyName} to ${partnerName}`);
                await supabase.from('clients')
                    .update({ partner_id: partnerId, tipo: 'cliente_final' })
                    .eq('id', company.id);
            } else {
                console.log(`Company not found: ${companyName}, creating...`);
                await supabase.from('clients')
                    .insert({
                        name: companyName,
                        tipo: 'cliente_final',
                        partnerId: partnerId, // Note: camelCase in frontend, checking DB column
                        partner_id: partnerId, // Using snake_case for DB
                        active: true
                    });
            }
        }
    }
    console.log('Finished syncing partners.');
}

syncPartners();
