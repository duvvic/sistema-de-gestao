const fs = require('fs');

async function testSignIn() {
    const supabaseUrl = 'https://awbfibpmylkfkfqarclk.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YmZpYnBteWxrZmtmcWFyY2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzAwNDAsImV4cCI6MjA3OTg0NjA0MH0.jXBE-HnVJNAg2pPjlPu8THjnNfVnJADdlNEOvlyiUFU';

    const url = `${supabaseUrl}/auth/v1/token?grant_type=password`;

    console.log('Testing sign in with password...');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey
            },
            body: JSON.stringify({
                email: 'nonexistent@test.com',
                password: 'wrongpassword'
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response body:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error during fetch:', error);
    }
}

testSignIn();
