require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configurações
const PORT = process.env.PORT || 3000;
const KIWIFY_API_KEY = process.env.KIWIFY_API_KEY;

// Inicializar cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Armazenar conversas ativas
const activeChats = new Map();

// QR Code para autenticação
client.on('qr', (qr) => {
    console.log('📱 Escaneie o QR Code abaixo com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Cliente pronto
client.on('ready', () => {
    console.log('✅ Bot WhatsApp conectado e pronto!');
});

// Receber mensagens
client.on('message', async (message) => {
    const chatId = message.from;
    const userMessage = message.body.toLowerCase().trim();

    console.log(`📩 Mensagem de ${chatId}: ${userMessage}`);

    try {
        // Menu inicial
        if (userMessage === 'oi' || userMessage === 'olá' || userMessage === 'menu') {
            await message.reply(
                `👋 Olá! Bem-vindo!\n\n` +
                `Escolha uma opção:\n` +
                `1️⃣ - Ver produtos\n` +
                `2️⃣ - Minhas compras\n` +
                `3️⃣ - Suporte\n\n` +
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
            await message.reply(productList);
            
            activeChats.set(chatId, { 
                stage: 'selecting_product',
                products: products 
            });
        }
        // Seleção de produto
        else if (activeChats.get(chatId)?.stage === 'selecting_product') {
            const productIndex = parseInt(userMessage) - 1;
            const chatData = activeChats.get(chatId);
            const product = chatData.products[productIndex];

            if (product) {
                const checkoutLink = await createKiwifyCheckout(product.id, chatId);
                
                await message.reply(
                    `✅ Produto selecionado: *${product.name}*\n\n` +
                    `💰 Valor: R$ ${product.price}\n\n` +
                    `🔗 Link de pagamento:\n${checkoutLink}\n\n` +
                    `Após o pagamento, você receberá uma confirmação aqui! 🎉`
                );
                
                activeChats.set(chatId, { 
                    stage: 'waiting_payment',
                    product: product 
                });
            } else {
                await message.reply('❌ Produto inválido. Digite *menu* para voltar.');
            }
        }
        // Minhas compras
        else if (userMessage === '2') {
            await message.reply(
                '📦 *Suas Compras*\n\n' +
                'Em breve você poderá consultar suas compras aqui!\n\n' +
                'Digite *menu* para voltar.'
            );
        }
        // Suporte
        else if (userMessage === '3') {
            await message.reply(
                '💬 *Suporte*\n\n' +
                'Estamos aqui para ajudar!\n' +
                'Descreva sua dúvida que responderemos em breve.\n\n' +
                'Digite *menu* para voltar ao menu principal.'
            );
        }
        // Comando desconhecido
        else {
            await message.reply(
                '❓ Desculpe, não entendi.\n' +
                'Digite *menu* para ver as opções disponíveis.'
            );
        }
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        await message.reply('❌ Ocorreu um erro. Tente novamente mais tarde.');
    }
});

// Webhook Kiwify (recebe notificações de pagamento)
app.post('/webhook/kiwify', async (req, res) => {
    console.log('📬 Webhook recebido da Kiwify:', req.body);
    
    const { event, data } = req.body;

    try {
        // Pagamento aprovado
        if (event === 'order.paid' || event === 'order.complete') {
            const customerPhone = data.customer.phone;
            const productName = data.product.name;
            const orderId = data.order_id;

            // Formatar número de telefone para WhatsApp (adicionar 55 se necessário)
            let whatsappNumber = customerPhone.replace(/\D/g, '');
            if (!whatsappNumber.startsWith('55')) {
                whatsappNumber = '55' + whatsappNumber;
            }
            whatsappNumber += '@c.us';

            // Enviar confirmação pelo WhatsApp
            await client.sendMessage(whatsappNumber, 
                `🎉 *Pagamento Confirmado!*\n\n` +
                `Produto: *${productName}*\n` +
                `Pedido: #${orderId}\n\n` +
                `Obrigado pela sua compra! ✅\n\n` +
                `Você receberá o acesso em breve.`
            );

            console.log(`✅ Confirmação enviada para ${whatsappNumber}`);
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

// Funções de integração com Kiwify
async function getKiwifyProducts() {
    try {
        // Endpoint da API Kiwify para listar produtos
        const response = await axios.get('https://api.kiwify.com.br/v1/products', {
            headers: {
                'Authorization': `Bearer ${KIWIFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.data || [];
    } catch (error) {
        console.error('Erro ao buscar produtos Kiwify:', error.message);
        // Retornar produtos de exemplo caso a API falhe
        return [
            {
                id: 'prod_123',
                name: 'Curso Completo',
                price: '197.00',
                description: 'Acesso vitalício ao curso'
            },
            {
                id: 'prod_456',
                name: 'Mentoria Individual',
                price: '497.00',
                description: '3 meses de mentoria'
            }
        ];
    }
}

async function createKiwifyCheckout(productId, customerPhone) {
    try {
        // Criar checkout na Kiwify
        const response = await axios.post('https://api.kiwify.com.br/v1/checkout', {
            product_id: productId,
            customer: {
                phone: customerPhone
            },
            // Adicionar metadata para rastrear de onde veio
            metadata: {
                source: 'whatsapp_bot',
                phone: customerPhone
            }
        }, {
            headers: {
                'Authorization': `Bearer ${KIWIFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.checkout_url;
    } catch (error) {
        console.error('Erro ao criar checkout:', error.message);
        // Retornar link de exemplo
        return `https://pay.kiwify.com.br/exemplo-checkout-${productId}`;
    }
}

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        bot: client.info ? 'conectado' : 'desconectado'
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    client.initialize();
});
