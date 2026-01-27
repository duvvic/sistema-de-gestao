import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncPartners() {
    console.log('Starting partner sync on dim_clientes...');

    // 1. Get all clients from dim_clientes
    const { data: clients, error: clientsError } = await supabase
        .from('dim_clientes')
        .select('ID_Cliente, NomeCliente');

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
        console.log(`\n--- Processing Partner: ${partnerName} ---`);

        // Find or Create Partner
        let partner = clients.find(c => c.NomeCliente.toUpperCase().trim() === partnerName.toUpperCase().trim());
        let partnerId;

        if (!partner) {
            console.log(`Creating Partner: ${partnerName}`);
            const { data: newPartner, error: createError } = await supabase
                .from('dim_clientes')
                .insert({ NomeCliente: partnerName, tipo_cliente: 'parceiro', ativo: true })
                .select()
                .single();

            if (createError) {
                console.error(`Error creating partner ${partnerName}:`, createError);
                continue;
            }
            partnerId = newPartner.ID_Cliente;
        } else {
            partnerId = partner.ID_Cliente;
            console.log(`Found Partner: ${partnerName} (ID: ${partnerId}), updating type...`);
            await supabase.from('dim_clientes').update({ tipo_cliente: 'parceiro' }).eq('ID_Cliente', partnerId);
        }

        // Link companies
        for (const companyName of companies) {
            let company = clients.find(c => c.NomeCliente.toUpperCase().trim() === companyName.toUpperCase().trim());

            if (company) {
                console.log(`Linking existing company ${companyName} to ${partnerName}`);
                const { error: updateError } = await supabase.from('dim_clientes')
                    .update({ partner_id: partnerId, tipo_cliente: 'cliente_final' })
                    .eq('ID_Cliente', company.ID_Cliente);

                if (updateError) console.error(`Error linking ${companyName}:`, updateError);
            } else {
                console.log(`Company not found: ${companyName}, creating...`);
                const { error: insertError } = await supabase.from('dim_clientes')
                    .insert({
                        NomeCliente: companyName,
                        tipo_cliente: 'cliente_final',
                        partner_id: partnerId,
                        ativo: true
                    });

                if (insertError) {
                    console.error(`Error creating ${companyName}:`, insertError);
                    // This might happen if partner_id column doesn't exist yet. 
                    // I will check if I can execute DDL through direct RPC if possible, but let's try this first.
                }
            }
        }
    }
    console.log('\n--- Finished syncing partners ---');
}

syncPartners();
