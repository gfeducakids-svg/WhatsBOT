require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Configurações
const PORT = process.env.PORT || 3000;
const KIWIFY_API_KEY = process.env.KIWIFY_API_KEY;
const TELEGRAM_GRUPO_MEMBROS = process.env.TELEGRAM_GRUPO_MEMBROS || '';
const AREA_MEMBROS_URL = process.env.AREA_MEMBROS_URL || '';

let sock;
let qrCodeData = null;
let isConnected = false;

// Armazenar conversas ativas (use Redis/Firestore em produção)
const activeChats = new Map();
const database = {
    carrinhos: new Map(),
    compras: new Map()
};

// Inicializar conexão WhatsApp com Baileys
async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: 'silent' }),
            browser: ['Bot Kiwify', 'Chrome', '1.0.0']
        });

        // Eventos de conexão
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 QR Code gerado!');
                qrCodeData = qr;
                
                // Gerar QR Code como imagem
                try {
                    const qrImage = await qrcode.toDataURL(qr);
                    console.log('🔗 Acesse para ver o QR Code: http://localhost:' + PORT + '/qr');
                } catch (err) {
                    console.error('Erro ao gerar QR:', err);
                }
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Conexão fechada. Reconectando...', shouldReconnect);
                
                if (shouldReconnect) {
                    await delay(3000);
                    connectToWhatsApp();
                }
                isConnected = false;
            } else if (connection === 'open') {
                console.log('✅ Bot WhatsApp conectado com sucesso!');
                isConnected = true;
                qrCodeData = null;
            }
        });

        // Salvar credenciais
        sock.ev.on('creds.update', saveCreds);

        // Receber mensagens
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const chatId = msg.key.remoteJid;
            const messageText = msg.message.conversation || 
                               msg.message.extendedTextMessage?.text || '';
            
            await handleMessage(chatId, messageText.toLowerCase().trim());
        });

    } catch (error) {
        console.error('❌ Erro ao conectar WhatsApp:', error);
        setTimeout(connectToWhatsApp, 5000);
    }
}

// Processar mensagens
async function handleMessage(chatId, userMessage) {
    console.log(`📩 Mensagem de ${chatId}: ${userMessage}`);

    try {
        // Menu inicial
        if (userMessage === 'oi' || userMessage === 'olá' || userMessage === 'menu') {
            await sendMessage(chatId,
                `👋 Olá! Bem-vindo!\n\n` +
                `Escolha uma opção:\n` +
                `1️⃣ - Ver produtos\n` +
                `2️⃣ - Minhas compras\n` +
                `3️⃣ - Acessar área de membros\n` +
                `4️⃣ - Suporte\n\n` +
                `Digite o número da opção desejada.`
            );
            activeChats.set(chatId, { stage: 'menu' });
        }
        // Ver produtos
        else if (userMessage === '1') {
            const products = await getKiwifyProducts();
            let productList = '🛍️ *Produtos Disponíveis:*\n\n';
            
            products.forEach((product, index) => {
                productList += `*${index + 1}. ${product.name}*\n`;
                productList += `💰 R$ ${product.price}\n`;
                productList += `📝 ${product.description}\n\n`;
            });
            
            productList += '\nDigite o número do produto para comprar.';
            await sendMessage(chatId, productList);
            
            database.carrinhos.set(chatId, {
                products: products,
                timestamp: Date.now(),
                stage: 'selecting'
            });
        }
        // Seleção de produto
        else if (database.carrinhos.has(chatId) && database.carrinhos.get(chatId).stage === 'selecting') {
            const productIndex = parseInt(userMessage) - 1;
            const carrinho = database.carrinhos.get(chatId);
            const product = carrinho.products[productIndex];

            if (product) {
                const checkoutLink = await createKiwifyCheckout(product.id, chatId);
                
                await sendMessage(chatId,
                    `✅ Produto selecionado: *${product.name}*\n\n` +
                    `💰 Valor: R$ ${product.price}\n\n` +
                    `🔗 *Link de pagamento:*\n${checkoutLink}\n\n` +
                    `⏰ Link válido por 30 minutos!\n\n` +
                    `Após o pagamento, você receberá acesso imediato! 🎉`
                );
                
                carrinho.stage = 'checkout_sent';
                carrinho.product = product;
                carrinho.checkoutLink = checkoutLink;
                carrinho.lastInteraction = Date.now();
                database.carrinhos.set(chatId, carrinho);

                // Agendar lembretes
                agendarLembretes(chatId, product, checkoutLink);
            }
        }
        // Minhas compras
        else if (userMessage === '2') {
            const compras = database.compras.get(chatId);
            
            if (compras && compras.length > 0) {
                let lista = '📦 *Suas Compras:*\n\n';
                compras.forEach((compra, index) => {
                    lista += `${index + 1}. ${compra.productName}\n`;
                    lista += `   📅 ${new Date(compra.date).toLocaleDateString('pt-BR')}\n`;
                    lista += `   💰 R$ ${compra.price}\n\n`;
                });
                await sendMessage(chatId, lista);
            } else {
                await sendMessage(chatId,
                    '📦 Você ainda não realizou compras.\n\n' +
                    'Digite *1* para ver nossos produtos!'
                );
            }
        }
        // Acessar área
        else if (userMessage === '3') {
            const compras = database.compras.get(chatId);
            
            if (compras && compras.length > 0) {
                let acessos = '🔐 *Seus Acessos:*\n\n';
                compras.forEach((compra) => {
                    acessos += `*${compra.productName}*\n`;
                    if (compra.accessLinks?.telegram) {
                        acessos += `📱 Telegram: ${compra.accessLinks.telegram}\n`;
                    }
                    if (compra.accessLinks?.members_area) {
                        acessos += `🌐 Área: ${compra.accessLinks.members_area}\n`;
                    }
                    acessos += '\n';
                });
                await sendMessage(chatId, acessos);
            } else {
                await sendMessage(chatId, 'Você precisa fazer uma compra primeiro!');
            }
        }
        // Suporte
        else if (userMessage === '4') {
            await sendMessage(chatId,
                '💬 *Suporte*\n\n' +
                'Estamos aqui para ajudar!\n' +
                'Descreva sua dúvida que responderemos em breve.'
            );
        }
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        await sendMessage(chatId, '❌ Ocorreu um erro. Tente novamente.');
    }
}

// Enviar mensagem
async function sendMessage(chatId, text) {
    try {
        await sock.sendMessage(chatId, { text });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
    }
}

// Sistema de lembretes
function agendarLembretes(chatId, product, checkoutLink) {
    // Lembrete 1: 15 minutos
    setTimeout(async () => {
        const carrinho = database.carrinhos.get(chatId);
        if (carrinho && carrinho.stage === 'checkout_sent') {
            await sendMessage(chatId,
                `⏰ *Lembrete Amigável*\n\n` +
                `Oi! Vi que você demonstrou interesse em:\n*${product.name}*\n\n` +
                `Ainda está com dúvidas?\n\n💳 ${checkoutLink}`
            );
        }
    }, 15 * 60 * 1000);

    // Lembrete 2: 1 hora com desconto
    setTimeout(async () => {
        const carrinho = database.carrinhos.get(chatId);
        if (carrinho && carrinho.stage === 'checkout_sent') {
            await sendMessage(chatId,
                `🎁 *OFERTA ESPECIAL!*\n\n` +
                `*DESCONTO de 10%* para você!\n\n` +
                `Use: *PRIMEIRACOMPRA*\n\n` +
                `💳 ${checkoutLink}\n\n⏰ Válido por 2 horas!`
            );
            carrinho.stage = 'discount_sent';
        }
    }, 60 * 60 * 1000);
}

// Integração Kiwify
async function getKiwifyProducts() {
    try {
        const response = await axios.get('https://api.kiwify.com.br/v1/products', {
            headers: { 'Authorization': `Bearer ${KIWIFY_API_KEY}` }
        });
        return response.data.data || [];
    } catch (error) {
        return [
            { id: 'prod_1', name: 'Curso Completo', price: '197.00', description: 'Acesso vitalício' },
            { id: 'prod_2', name: 'Mentoria', price: '497.00', description: '3 meses' }
        ];
    }
}

async function createKiwifyCheckout(productId, customerPhone) {
    try {
        const response = await axios.post('https://api.kiwify.com.br/v1/checkout', {
            product_id: productId,
            customer: { phone: customerPhone }
        }, {
            headers: { 'Authorization': `Bearer ${KIWIFY_API_KEY}` }
        });
        return response.data.checkout_url;
    } catch (error) {
        return `https://pay.kiwify.com.br/checkout-${productId}`;
    }
}

// Webhook Kiwify
app.post('/webhook/kiwify', async (req, res) => {
    console.log('📬 Webhook Kiwify:', req.body);
    
    const { event, data } = req.body;

    try {
        if (event === 'order.paid' || event === 'order.complete') {
            let whatsappNumber = data.customer.phone.replace(/\D/g, '');
            if (!whatsappNumber.startsWith('55')) whatsappNumber = '55' + whatsappNumber;
            whatsappNumber += '@s.whatsapp.net';

            database.carrinhos.delete(whatsappNumber);

            const compra = {
                orderId: data.order_id,
                productName: data.product.name,
                price: data.order_value,
                date: Date.now(),
                status: 'Aprovado',
                accessLinks: {
                    telegram: TELEGRAM_GRUPO_MEMBROS,
                    members_area: AREA_MEMBROS_URL
                }
            };

            if (!database.compras.has(whatsappNumber)) {
                database.compras.set(whatsappNumber, []);
            }
            database.compras.get(whatsappNumber).push(compra);

            await sendMessage(whatsappNumber,
                `🎉 *PAGAMENTO CONFIRMADO!*\n\n` +
                `Produto: *${data.product.name}*\n` +
                `Pedido: #${data.order_id}\n\n` +
                `✅ *SEUS ACESSOS:*\n\n` +
                `📱 Telegram: ${TELEGRAM_GRUPO_MEMBROS}\n` +
                `🌐 Área: ${AREA_MEMBROS_URL}\n\n` +
                `Bem-vindo! 🎉`
            );
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para ver QR Code
app.get('/qr', async (req, res) => {
    if (qrCodeData) {
        try {
            const qrImage = await qrcode.toDataURL(qrCodeData);
            res.send(`
                <html>
                <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;">
                    <h1>📱 Escaneie o QR Code</h1>
                    <img src="${qrImage}" />
                    <p>Abra o WhatsApp e escaneie este código</p>
                </body>
                </html>
            `);
        } catch (error) {
            res.send('Erro ao gerar QR Code');
        }
    } else if (isConnected) {
        res.send('<h1>✅ Bot já está conectado!</h1>');
    } else {
        res.send('<h1>⏳ Aguardando QR Code...</h1><script>setTimeout(() => location.reload(), 3000)</script>');
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        connected: isConnected,
        qrReady: !!qrCodeData
    });
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 QR Code disponível em: http://localhost:${PORT}/qr`);
    await connectToWhatsApp();
});
