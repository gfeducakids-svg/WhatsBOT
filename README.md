# 🤖 Bot WhatsApp + Kiwify

Bot de WhatsApp integrado com checkout Kiwify para automação de vendas.

## 🚀 Funcionalidades

- ✅ Menu interativo no WhatsApp
- 🛍️ Listagem de produtos da Kiwify
- 💳 Geração automática de links de pagamento
- 📬 Confirmação automática de pagamento via webhook
- 🔔 Notificações em tempo real

## 📋 Pré-requisitos

- Conta no GitHub
- Conta na Vercel (gratuita)
- Conta na Kiwify com API Key
- Número de WhatsApp para o bot

## 🔧 Instalação Local (Teste)

### 1. Clone o repositório

```bash
git clone seu-repositorio.git
cd whatsapp-kiwify-bot
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
PORT=3000
KIWIFY_API_KEY=sua_api_key_da_kiwify
```

### 4. Execute o bot

```bash
npm start
```

### 5. Escaneie o QR Code

Abra o WhatsApp no celular e escaneie o QR Code que aparecerá no terminal.

## ☁️ Deploy na Vercel

### 1. Faça push para o GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin seu-repositorio.git
git push -u origin main
```

### 2. Conecte com a Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Import Project"
3. Selecione seu repositório do GitHub
4. Configure as variáveis de ambiente:
   - `KIWIFY_API_KEY`: Sua API Key da Kiwify

### 3. Configure o Webhook na Kiwify

1. Acesse [dashboard.kiwify.com.br](https://dashboard.kiwify.com.br)
2. Vá em **Configurações > Webhooks**
3. Adicione a URL: `https://seu-app.vercel.app/webhook/kiwify`
4. Selecione os eventos:
   - `order.paid`
   - `order.complete`

## 📱 Como Usar

### Comandos do Bot

- `oi` ou `menu` - Mostra o menu principal
- `1` - Ver produtos disponíveis
- `2` - Consultar minhas compras
- `3` - Falar com suporte

### Fluxo de Compra

1. Cliente envia "oi" no WhatsApp
2. Bot mostra menu de produtos
3. Cliente escolhe produto (ex: "1")
4. Bot gera link de pagamento Kiwify
5. Cliente efetua pagamento
6. Kiwify envia webhook para o bot
7. Bot confirma pagamento no WhatsApp automaticamente

## 🔑 Obter API Key da Kiwify

1. Acesse [dashboard.kiwify.com.br](https://dashboard.kiwify.com.br)
2. Vá em **Configurações > API**
3. Clique em "Gerar Nova Chave"
4. Copie a API Key

## ⚠️ Limitações da Vercel

**IMPORTANTE**: A Vercel tem limitações para bots WhatsApp:

- ❌ Sessões não persistem entre deploys
- ❌ Função serverless tem timeout de 10s (hobby) / 60s (pro)
- ❌ O bot precisará reconectar após cada deploy

### Alternativas Recomendadas

Para produção, use:

- **Railway.app** (gratuito com $5/mês de crédito)
- **Render.com** (plano gratuito)
- **VPS (DigitalOcean, Vultr, etc.)** - Melhor opção

## 🐛 Solução de Problemas

### Bot não conecta no WhatsApp
- Verifique se o número já está conectado em outro lugar
- Limpe a pasta `.wwebjs_auth`
- Tente escanear o QR Code novamente

### Webhook não funciona
- Verifique se a URL está correta na Kiwify
- Teste a URL: `https://seu-app.vercel.app/`
- Verifique os logs da Vercel

### Produtos não aparecem
- Verifique se a API Key está correta
- Confirme que tem produtos ativos na Kiwify
- Veja os logs de erro

## 📚 Documentação

- [Kiwify API](https://docs.kiwify.com.br)
- [WhatsApp Web.js](https://wwebjs.dev)
- [Vercel Docs](https://vercel.com/docs)

## 🤝 Suporte

Para dúvidas e sugestões, abra uma issue no GitHub.

## 📄 Licença

MIT License - Livre para uso pessoal e comercial.

---

**Feito com ❤️ para automatizar suas vendas!**
