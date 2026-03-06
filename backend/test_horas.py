import urllib.request
import json
import os
import re

def parse_env(path):
    with open(path) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

parse_env(".env")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

url = f"{SUPABASE_URL}/rest/v1/horas_trabalhadas?select=*"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Total registros: {len(data)}")
        if len(data) > 0:
            print("Amostra", data[0])
except Exception as e:
    print("Erro:", e)
