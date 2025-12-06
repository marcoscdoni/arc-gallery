# Indexer Deployment Guide

O indexer é um processo que roda em background e sincroniza eventos da blockchain com o Supabase em tempo real.

## 🚀 Opções de Deployment

### Opção 1: PM2 (Produção - Recomendado)

PM2 é um gerenciador de processos que mantém o indexer rodando 24/7 com restart automático.

**Instalação:**
```bash
npm install -g pm2
```

**Comandos:**
```bash
# Iniciar indexer
npm run indexer:start

# Ver logs em tempo real
npm run indexer:logs

# Parar indexer
npm run indexer:stop

# Reiniciar indexer
npm run indexer:restart

# Ver status
npm run indexer:status

# Fazer PM2 iniciar automaticamente no boot do sistema
pm2 startup
pm2 save
```

### Opção 2: Docker

**Criar Dockerfile para o indexer:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "run", "indexer"]
```

**Rodar com Docker:**
```bash
docker build -t arc-indexer .
docker run -d --name arc-indexer --restart unless-stopped \
  --env-file frontend/.env.local \
  arc-indexer
```

### Opção 3: Systemd Service (Linux)

**Criar arquivo `/etc/systemd/system/arc-indexer.service`:**
```ini
[Unit]
Description=Arc NFT Indexer
After=network.target

[Service]
Type=simple
User=marcos
WorkingDirectory=/home/marcos/Projetos/arc-gallery
ExecStart=/usr/bin/npm run indexer
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Comandos:**
```bash
sudo systemctl enable arc-indexer
sudo systemctl start arc-indexer
sudo systemctl status arc-indexer
sudo journalctl -u arc-indexer -f
```

### Opção 4: Cloud Platforms

#### **Railway.app**
1. Criar novo projeto
2. Conectar repositório GitHub
3. Adicionar variáveis de ambiente do `.env.local`
4. Configurar start command: `npm run indexer`

#### **Render.com**
1. Criar novo "Background Worker"
2. Build command: `npm install`
3. Start command: `npm run indexer`
4. Adicionar variáveis de ambiente

#### **DigitalOcean App Platform**
1. Criar "Worker" component
2. Run command: `npm run indexer`
3. Adicionar variáveis de ambiente

## 📊 Monitoring

### Verificar se está funcionando:
```bash
# Ver logs
npm run indexer:logs

# Ou verificar direto no Supabase
# Os preços devem estar atualizados na tabela nfts
```

### Métricas importantes:
- ✅ Indexer conectado ao RPC
- ✅ Eventos sendo capturados
- ✅ Database sendo atualizado
- ✅ Sem erros nos logs

## 🔧 Troubleshooting

**Indexer não inicia:**
```bash
# Verificar variáveis de ambiente
cat frontend/.env.local

# Verificar conectividade com RPC
curl https://rpc.testnet.arc.network

# Verificar conectividade com Supabase
# (testar no frontend)
```

**Indexer para sozinho:**
- PM2 vai reiniciar automaticamente
- Verificar logs: `npm run indexer:logs`
- Verificar memória: `pm2 monit`

**Eventos não sincronizam:**
- Verificar se o RPC está acessível
- Verificar credenciais do Supabase (service role key)
- Verificar endereços dos contratos

## 🔄 Workflow de Deploy

```bash
# 1. Deploy frontend (Vercel/Netlify)
cd frontend && npm run build

# 2. Executar sync histórico (uma vez)
npm run sync-historical

# 3. Iniciar indexer em produção
npm run indexer:start

# 4. Verificar logs
npm run indexer:logs
```

## 📝 Variáveis de Ambiente Necessárias

O indexer usa as mesmas variáveis do `frontend/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NFT_CONTRACT_ADDRESS`

## 🎯 Eventos Monitorados

**NFT Contract:**
- `NFTMinted` - Novo NFT criado
- `Transfer` - Mudança de dono

**Marketplace Contract:**
- `ListingCreated` - NFT listado para venda
- `ListingUpdated` - Preço atualizado
- `ListingCancelled` - Listagem cancelada
- `NFTSold` - NFT vendido

## ⚡ Performance

- **Latência:** ~1-2 segundos após evento on-chain
- **Uso de memória:** ~50-100 MB
- **CPU:** Mínimo (só processa quando há eventos)
- **Rede:** ~1-5 KB/s (polling RPC)

## 🔐 Segurança

- Usar `SUPABASE_SERVICE_ROLE_KEY` (não a anon key)
- Rodar em servidor seguro (não expor portas)
- Manter logs para auditoria
- Monitorar uso de recursos

## 📅 Manutenção

**Diário:**
- Verificar logs: `npm run indexer:logs`

**Semanal:**
- Verificar sincronização: comparar blockchain vs database
- Limpar logs antigos: `pm2 flush`

**Mensal:**
- Executar sync histórico para garantir consistência
- Atualizar dependências: `npm update`
