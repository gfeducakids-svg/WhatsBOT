# ⚡ INÍCIO RÁPIDO - 10 MINUTOS

## 🎯 OBJETIVO
Ter seu bot funcionando em 10 minutos!

---

## 📋 PASSO A PASSO

### 1️⃣ ESCOLHA SUA VERSÃO (1 min)

```
PRIMEIRA VEZ COM BOTS?
→ Use: index.js (versão básica)

JÁ TEM EXPERIÊNCIA OU MUITAS VENDAS?
→ Use: index-v2.js (versão avançada)
```

💡 **Dica**: Na dúvida? Use a avançada! Vale a pena.

---

### 2️⃣ CONFIGURE O .ENV (2 min)

```bash
# Copie o exemplo
cp .env.example .env
```

Edite o `.env` e adicione:

```env
# OBRIGATÓRIO
KIWIFY_API_KEY=sua_api_key_aqui

# OPCIONAL (para versão avançada)
TELEGRAM_GRUPO_MEMBROS=https://t.me/+seu_link
AREA_MEMBROS_URL=https://sua-area.com
```

📌 **Onde pegar a API Key da Kiwify:**
1. Acesse: dashboard.kiwify.com.br
2. Vá em Configurações → API
3. Gerar Nova Chave
4. Copie e cole no .env

---

### 3️⃣ TESTE LOCAL (2 min)

```bash
# Instale dependências
npm install

# Se escolheu BÁSICA:
node index.js

# Se escolheu AVANÇADA:
node index-v2.js
```

📱 **Aparecer QR Code?** Ótimo! Escaneie com WhatsApp.

---

### 4️⃣ DEPLOY NO RAILWAY (3 min)

```bash
# 1. Commit no Git
git init
git add .
git commit -m "Meu bot Kiwify"

# 2. Push pro GitHub
git remote add origin seu-repo.git
git push -u origin main
```

**No Railway:**
1. Acesse: railway.app
2. New Project → Deploy from GitHub
3. Selecione seu repositório
4. Adicione variável: `KIWIFY_API_KEY`
5. Deploy automático! 🚀

---

### 5️⃣ CONFIGURE WEBHOOK KIWIFY (2 min)

1. Acesse: dashboard.kiwify.com.br
2. Vá em Configurações → Webhooks
3. Adicione URL: `https://seu-bot.railway.app/webhook/kiwify`
4. Selecione eventos:
   - ✅ order.paid
   - ✅ order.complete
5. Salve!

---

## ✅ PRONTO! SEU BOT ESTÁ FUNCIONANDO!

### 🧪 TESTE AGORA:

1. Mande "oi" para o número do bot no WhatsApp
2. Escolha opção 1 (Ver produtos)
3. Faça uma compra teste
4. Verifique se recebeu confirmação

---

## 🎉 FUNCIONOU?

### BÁSICA funcionando:
- ✅ Menu interativo
- ✅ Lista produtos
- ✅ Gera checkout
- ✅ Confirma pagamento

### AVANÇADA funcionando:
- ✅ Tudo da básica +
- ✅ Lembretes automáticos (teste não pagando)
- ✅ Liberação de acesso completa
- ✅ Dashboard: `seu-bot.railway.app/stats`

---

## 🔍 NÃO FUNCIONOU?

### QR Code não aparece
```bash
# Limpe e tente de novo
rm -rf .wwebjs_auth
node index.js
```

### Webhook não funciona
```bash
# Teste se o bot está online
curl https://seu-bot.railway.app/

# Deve retornar: {"status":"online"}
```

### Produtos não aparecem
- Valide sua API Key da Kiwify
- Veja logs: Railway → Deployments → View Logs

---

## 📊 PRÓXIMOS PASSOS

### Depois de funcionar:

1. **Leia a documentação completa**
   - README-PRINCIPAL.md (visão geral)
   - RECUPERACAO-VENDAS.md (se usar avançada)

2. **Personalize as mensagens**
   - Edite o código para seu nicho
   - Teste diferentes abordagens

3. **Monitore resultados**
   - Veja /stats diariamente
   - Acompanhe conversão

4. **Otimize baseado em dados**
   - Ajuste timing dos lembretes
   - Teste novos descontos
   - Melhore mensagens

---

## 💡 DICAS RÁPIDAS

### Para VERSÃO BÁSICA:
```
✅ Comece simples
✅ Entenda o funcionamento
✅ Depois migre para avançada
```

### Para VERSÃO AVANÇADA:
```
✅ Configure TODOS os acessos
✅ Teste os 3 lembretes
✅ Monitore recuperação
✅ Use o dashboard /stats
```

---

## 🆘 PROBLEMAS COMUNS

### "Cannot find module..."
```bash
npm install
```

### "Invalid API Key"
```bash
# Verifique .env
# API Key correta da Kiwify?
```

### Bot desconecta
```bash
# No Railway, isso é normal
# QR Code aparece nos logs
# Escaneie novamente
```

### Carrinho não recupera
```bash
# Só funciona na versão AVANÇADA (index-v2.js)
# Tempo mínimo: 15 minutos
# Veja logs para confirmar
```

---

## 📈 RESULTADOS ESPERADOS

### Semana 1:
```
📊 Entender o sistema
🧪 Testes e ajustes
📝 Primeiras vendas
```

### Semana 2-4:
```
📈 Otimizar mensagens
💰 Aumentar conversão
🎯 Recuperar vendas
```

### Mês 2+:
```
🚀 Escalar operação
💎 Adicionar produtos
📊 Duplicar receita
```

---

## 🎯 META

**Aumentar conversão em até 97% com recuperação automática!**

---

## 🔗 LINKS ÚTEIS

- [Kiwify Dashboard](https://dashboard.kiwify.com.br)
- [Railway Dashboard](https://railway.app/dashboard)
- [Docs Kiwify API](https://docs.kiwify.com.br)

---

## 💪 VOCÊ CONSEGUE!

Qualquer dúvida:
1. Leia README-PRINCIPAL.md
2. Confira documentação específica
3. Veja logs de erro
4. Teste passo a passo

**Boa sorte com suas vendas! 🚀💰**
