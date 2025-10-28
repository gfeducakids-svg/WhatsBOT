# 🚂 Deploy no Railway (RECOMENDADO para Bots WhatsApp)

O Railway é melhor que Vercel para bots WhatsApp porque mantém a sessão ativa 24/7.

## Por que Railway?

- ✅ Servidor sempre ativo (não serverless)
- ✅ Mantém sessão do WhatsApp conectada
- ✅ $5 de crédito gratuito por mês
- ✅ Não precisa reconectar após deploy
- ✅ Sem timeout em requisições

## 🚀 Como fazer deploy no Railway

### 1. Crie conta no Railway

Acesse: https://railway.app e faça login com GitHub

### 2. Crie novo projeto

1. Clique em "New Project"
2. Selecione "Deploy from GitHub repo"
3. Escolha seu repositório
4. Railway detecta automaticamente Node.js

### 3. Configure variáveis de ambiente

No painel do Railway:
1. Vá em "Variables"
2. Adicione:
   ```
   KIWIFY_API_KEY=sua_api_key_aqui
   PORT=3000
   ```

### 4. Deploy automático

Railway faz deploy automaticamente! ✨

### 5. Obtenha a URL do seu bot

1. Vá em "Settings" > "Networking"
2. Clique em "Generate Domain"
3. Copie a URL (ex: `seu-bot.up.railway.app`)

### 6. Configure webhook na Kiwify

Use a URL: `https://seu-bot.up.railway.app/webhook/kiwify`

### 7. Conecte o WhatsApp

1. Acesse os logs: `View Logs` no painel
2. Procure o QR Code nos logs
3. Escaneie com seu WhatsApp

**IMPORTANTE**: No Railway, o QR Code aparece nos logs. Use um visualizador de QR Code online se necessário.

## 💡 Dica: Ver QR Code nos Logs

Os logs mostrarão o QR Code em ASCII. Se não conseguir escanear:

1. Copie o código QR dos logs
2. Cole em: https://qr-ascii-art-generator.vercel.app/decode
3. Escaneie o QR Code gerado

## 💰 Custos

- **Gratuito**: $5 de crédito/mês
- Suficiente para ~500 horas de servidor (24/7 = 720h)
- Após gastar os $5, precisa adicionar cartão

## 🔄 Reconectar WhatsApp

Se desconectar, basta:
1. Ver os logs novos
2. Escanear o novo QR Code

## 📊 Monitorar uso

No dashboard do Railway você vê:
- Uso de CPU
- Memória
- Créditos restantes
- Logs em tempo real

---

## ⚡ Vercel vs Railway

| Recurso | Vercel | Railway |
|---------|--------|---------|
| Tipo | Serverless | Servidor dedicado |
| Sessão WhatsApp | ❌ Não persiste | ✅ Persiste |
| Timeout | 10-60s | ✅ Ilimitado |
| Melhor para | Sites, APIs | Bots, serviços |
| Preço (hobby) | Grátis | $5 crédito/mês |

**Conclusão**: Use Railway para bots WhatsApp! 🚂
