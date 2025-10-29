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
const TELEGRAM_GRUPO_MEMBROS = process.env.TELEGRAM_GRUPO_MEMBROS || '';
const AREA_MEMBROS_URL = process.env.AREA_MEMBROS_URL || '';

// Inicializar cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Banco de dados em memória (use MongoDB/PostgreSQL em produção)
const database = {
    carrinhos: new Map(), // Carrinhos abandonados
    compras: new Map(),   // Histórico de compras
    lembretes: new Map()  // Lembretes agendados
};

// QR Code para autenticação
client.on('qr', (qr) => {
    console.log('📱 Escaneie o QR Code abaixo com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Cliente pronto
client.on('ready', () => {
    console.log('✅ Bot WhatsApp conectado e pronto!');
    iniciarSistemaRecuperacao();
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
                `3️⃣ - Acessar área de membros\n` +
                `4️⃣ - Suporte\n\n` +
                `Digite o número da opção desejada.`
            );
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
                
                await message.reply(
                    `✅ Produto selecionado: *${product.name}*\n\n` +
                    `💰 Valor: R$ ${product.price}\n\n` +
                    `🔗 *Link de pagamento:*\n${checkoutLink}\n\n` +
                    `⏰ Link válido por 30 minutos!\n\n` +
                    `Após o pagamento, você receberá:\n` +
                    `✅ Confirmação instantânea\n` +
                    `🎁 Acesso ao produto\n` +
                    `📚 Materiais de bônus`
                );
                
                // Atualizar carrinho
                carrinho.stage = 'checkout_sent';
                carrinho.product = product;
                carrinho.checkoutLink = checkoutLink;
                carrinho.lastInteraction = Date.now();
                database.carrinhos.set(chatId, carrinho);

                // Agendar lembretes de recuperação
                agendarLembretes(chatId, product);
                
            } else {
                await message.reply('❌ Produto inválido. Digite *menu* para voltar.');
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
                    lista += `   💰 R$ ${compra.price}\n`;
                    lista += `   ✅ ${compra.status}\n\n`;
                });
                lista += '\nDigite *3* para acessar seus produtos.';
                await message.reply(lista);
            } else {
                await message.reply(
                    '📦 *Suas Compras*\n\n' +
                    'Você ainda não realizou nenhuma compra.\n\n' +
                    'Digite *1* para ver nossos produtos!'
                );
            }
        }
        // Acessar área de membros
        else if (userMessage === '3') {
            const compras = database.compras.get(chatId);
            
            if (compras && compras.length > 0) {
                let acessos = '🔐 *Seus Acessos:*\n\n';
                
                compras.forEach((compra, index) => {
                    acessos += `*${index + 1}. ${compra.productName}*\n`;
                    
                    if (compra.accessLinks) {
                        if (compra.accessLinks.telegram) {
                            acessos += `📱 Telegram: ${compra.accessLinks.telegram}\n`;
                        }
                        if (compra.accessLinks.members_area) {
                            acessos += `🌐 Área de Membros: ${compra.accessLinks.members_area}\n`;
                        }
                        if (compra.accessLinks.download) {
                            acessos += `📥 Download: ${compra.accessLinks.download}\n`;
                        }
                    }
                    acessos += '\n';
                });
                
                await message.reply(acessos);
            } else {
                await message.reply(
                    '🔐 *Área de Membros*\n\n' +
                    'Você precisa fazer uma compra primeiro para ter acesso.\n\n' +
                    'Digite *1* para ver nossos produtos!'
                );
            }
        }
        // Suporte
        else if (userMessage === '4') {
            await message.reply(
                '💬 *Suporte*\n\n' +
                'Estamos aqui para ajudar!\n' +
                'Descreva sua dúvida que responderemos em breve.\n\n' +
                'Tempo médio de resposta: 2 horas\n\n' +
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

// Sistema de recuperação de carrinho abandonado
function agendarLembretes(chatId, product) {
    // Lembrete 1: Após 15 minutos
    setTimeout(async () => {
        const carrinho = database.carrinhos.get(chatId);
        if (carrinho && carrinho.stage === 'checkout_sent') {
            await client.sendMessage(chatId,
                `⏰ *Lembrete Amigável*\n\n` +
                `Oi! Vi que você demonstrou interesse em:\n` +
                `*${product.name}*\n\n` +
                `Ainda está com dúvidas? Estou aqui para ajudar!\n\n` +
                `💳 Seu link de pagamento:\n${carrinho.checkoutLink}`
            );
            console.log(`📧 Lembrete 1 enviado para ${chatId}`);
        }
    }, 15 * 60 * 1000); // 15 minutos

    // Lembrete 2: Após 1 hora com desconto
    setTimeout(async () => {
        const carrinho = database.carrinhos.get(chatId);
        if (carrinho && carrinho.stage === 'checkout_sent') {
            await client.sendMessage(chatId,
                `🎁 *OFERTA ESPECIAL PRA VOCÊ!*\n\n` +
                `Como você demonstrou interesse em:\n` +
                `*${product.name}*\n\n` +
                `Vou liberar um *DESCONTO EXCLUSIVO de 10%*\n` +
                `para você fechar hoje! 🔥\n\n` +
                `Use o cupom: *PRIMEIRACOMPRA*\n\n` +
                `💳 Finalizar com desconto:\n${carrinho.checkoutLink}\n\n` +
                `⏰ Válido apenas por 2 horas!`
            );
            carrinho.stage = 'discount_sent';
            database.carrinhos.set(chatId, carrinho);
            console.log(`🎁 Desconto enviado para ${chatId}`);
        }
    }, 60 * 60 * 1000); // 1 hora

    // Lembrete 3: Após 24 horas - última chance
    setTimeout(async () => {
        const carrinho = database.carrinhos.get(chatId);
        if (carrinho && (carrinho.stage === 'checkout_sent' || carrinho.stage === 'discount_sent')) {
            await client.sendMessage(chatId,
                `⚠️ *ÚLTIMA CHANCE!*\n\n` +
                `Seu interesse em *${product.name}* expira em breve!\n\n` +
                `🎁 Seu desconto de 10% ainda está ativo\n` +
                `⏰ Mas só por mais algumas horas...\n\n` +
                `Não perca essa oportunidade!\n\n` +
                `💳 ${carrinho.checkoutLink}\n\n` +
                `Tem alguma dúvida? É só responder!`
            );
            console.log(`⚠️ Última chance enviada para ${chatId}`);
        }
    }, 24 * 60 * 60 * 1000); // 24 horas
}

// Sistema de verificação periódica (roda a cada hora)
function iniciarSistemaRecuperacao() {
    setInterval(() => {
        console.log('🔍 Verificando carrinhos abandonados...');
        
        const agora = Date.now();
        let carrinhoAbandonados = 0;

        database.carrinhos.forEach((carrinho, chatId) => {
            const tempoDecorrido = agora - carrinho.lastInteraction;
            const horas = tempoDecorrido / (1000 * 60 * 60);
            
            // Se passou mais de 48h sem interação, limpar carrinho
            if (horas > 48) {
                database.carrinhos.delete(chatId);
                console.log(`🗑️ Carrinho limpo: ${chatId}`);
            } else if (carrinho.stage === 'checkout_sent' || carrinho.stage === 'discount_sent') {
                carrinhoAbandonados++;
            }
        });

        console.log(`📊 Carrinhos abandonados ativos: ${carrinhoAbandonados}`);
    }, 60 * 60 * 1000); // A cada 1 hora
}

// Webhook Kiwify (recebe notificações de pagamento)
app.post('/webhook/kiwify', async (req, res) => {
    console.log('📬 Webhook recebido da Kiwify:', JSON.stringify(req.body, null, 2));
    
    const { event, data } = req.body;

    try {
        // Pagamento aprovado
        if (event === 'order.paid' || event === 'order.complete') {
            const customerPhone = data.customer.phone;
            const productName = data.product.name;
            const productId = data.product.id;
            const orderId = data.order_id;
            const orderValue = data.order_value;

            // Formatar número de telefone para WhatsApp
            let whatsappNumber = customerPhone.replace(/\D/g, '');
            if (!whatsappNumber.startsWith('55')) {
                whatsappNumber = '55' + whatsappNumber;
            }
            whatsappNumber += '@c.us';

            // Remover carrinho abandonado
            database.carrinhos.delete(whatsappNumber);

            // Gerar acessos ao produto
            const acessos = await gerarAcessoProduto(productId, customerPhone, data);

            // Salvar compra no banco
            const compra = {
                orderId: orderId,
                productName: productName,
                productId: productId,
                price: orderValue,
                date: Date.now(),
                status: 'Aprovado',
                accessLinks: acessos,
                customerData: data.customer
            };

            if (!database.compras.has(whatsappNumber)) {
                database.compras.set(whatsappNumber, []);
            }
            database.compras.get(whatsappNumber).push(compra);

            // Enviar confirmação e acessos pelo WhatsApp
            let mensagemAcesso = `🎉 *PAGAMENTO CONFIRMADO!*\n\n`;
            mensagemAcesso += `Produto: *${productName}*\n`;
            mensagemAcesso += `Pedido: #${orderId}\n`;
            mensagemAcesso += `Valor: R$ ${orderValue}\n\n`;
            mensagemAcesso += `✅ *SEUS ACESSOS:*\n\n`;

            if (acessos.telegram) {
                mensagemAcesso += `📱 *Grupo no Telegram:*\n${acessos.telegram}\n\n`;
            }

            if (acessos.members_area) {
                mensagemAcesso += `🌐 *Área de Membros:*\n${acessos.members_area}\n\n`;
                mensagemAcesso += `👤 Login: ${acessos.login}\n`;
                mensagemAcesso += `🔑 Senha: ${acessos.senha}\n\n`;
            }

            if (acessos.download) {
                mensagemAcesso += `📥 *Download Direto:*\n${acessos.download}\n\n`;
            }

            mensagemAcesso += `🎁 *Bônus Inclusos:*\n`;
            mensagemAcesso += `✅ Suporte vitalício\n`;
            mensagemAcesso += `✅ Atualizações gratuitas\n`;
            mensagemAcesso += `✅ Comunidade exclusiva\n\n`;
            mensagemAcesso += `Qualquer dúvida, é só chamar! 😊`;

            await client.sendMessage(whatsappNumber, mensagemAcesso);

            // Enviar materiais complementares após 2 minutos
            setTimeout(async () => {
                await client.sendMessage(whatsappNumber,
                    `📚 *MATERIAIS COMPLEMENTARES*\n\n` +
                    `Aqui estão alguns recursos extras para você:\n\n` +
                    `📖 Guia de início rápido\n` +
                    `🎥 Vídeos de boas-vindas\n` +
                    `💡 Dicas para aproveitar ao máximo\n\n` +
                    `Baixe tudo aqui: ${acessos.bonuses || 'Em breve!'}`
                );
            }, 2 * 60 * 1000);

            console.log(`✅ Acesso liberado para ${whatsappNumber}`);
        }
        
        // Pagamento recusado
        else if (event === 'order.refused' || event === 'order.refunded') {
            const customerPhone = data.customer.phone;
            let whatsappNumber = customerPhone.replace(/\D/g, '');
            if (!whatsappNumber.startsWith('55')) {
                whatsappNumber = '55' + whatsappNumber;
            }
            whatsappNumber += '@c.us';

            await client.sendMessage(whatsappNumber,
                `⚠️ *Problema com o pagamento*\n\n` +
                `Infelizmente seu pagamento não foi aprovado.\n\n` +
                `🔄 Você pode tentar novamente com outro método\n` +
                `💳 Ou entrar em contato para ajudarmos\n\n` +
                `Digite *menu* para tentar novamente.`
            );
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

// Gerar acessos ao produto
async function gerarAcessoProduto(productId, customerPhone, orderData) {
    const acessos = {};

    // Aqui você integra com suas plataformas
    
    // Exemplo: Gerar link do Telegram
    if (TELEGRAM_GRUPO_MEMBROS) {
        acessos.telegram = TELEGRAM_GRUPO_MEMBROS;
    }

    // Exemplo: Criar acesso na área de membros
    if (AREA_MEMBROS_URL) {
        // Gerar credenciais
        const email = orderData.customer.email;
        const senha = gerarSenhaAleatoria();
        
        // Aqui você chamaria sua API para criar o usuário
        // await criarUsuarioAreaMembros(email, senha, productId);
        
        acessos.members_area = AREA_MEMBROS_URL;
        acessos.login = email;
        acessos.senha = senha;
    }

    // Links de download (Google Drive, Dropbox, etc)
    acessos.download = `https://drive.google.com/seu-produto-${productId}`;
    acessos.bonuses = `https://drive.google.com/bonus-${productId}`;

    return acessos;
}

// Funções auxiliares
function gerarSenhaAleatoria() {
    return Math.random().toString(36).slice(-8).toUpperCase();
}

async function getKiwifyProducts() {
    try {
        const response = await axios.get('https://api.kiwify.com.br/v1/products', {
            headers: {
                'Authorization': `Bearer ${KIWIFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.data || [];
    } catch (error) {
        console.error('Erro ao buscar produtos:', error.message);
        return [
            {
                id: 'prod_123',
                name: 'Curso Completo de Marketing Digital',
                price: '197.00',
                description: 'Acesso vitalício + bônus exclusivos'
            },
            {
                id: 'prod_456',
                name: 'Mentoria Individual 3 Meses',
                price: '497.00',
                description: 'Acompanhamento personalizado'
            }
        ];
    }
}

async function createKiwifyCheckout(productId, customerPhone) {
    try {
        const response = await axios.post('https://api.kiwify.com.br/v1/checkout', {
            product_id: productId,
            customer: {
                phone: customerPhone
            },
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
        return `https://pay.kiwify.com.br/exemplo-checkout-${productId}`;
    }
}

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        bot: client.info ? 'conectado' : 'desconectado',
        stats: {
            carrinhos_ativos: database.carrinhos.size,
            total_compras: Array.from(database.compras.values()).reduce((sum, arr) => sum + arr.length, 0)
        }
    });
});

// Endpoint para ver estatísticas
app.get('/stats', (req, res) => {
    const stats = {
        carrinhos_abandonados: database.carrinhos.size,
        total_clientes: database.compras.size,
        total_vendas: Array.from(database.compras.values()).reduce((sum, arr) => sum + arr.length, 0),
        receita_total: Array.from(database.compras.values())
            .flat()
            .reduce((sum, compra) => sum + parseFloat(compra.price), 0)
    };
    res.json(stats);
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/stats`);
    client.initialize();
});
