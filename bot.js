const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// Configuración mejorada
const TU_NUMERO_AUTORIZADO = "2915353060"; // Asegúrate que sea correcto

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

// Eventos
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('🔍 Escanea el QR en WhatsApp Web');
});

client.on('ready', () => {
    console.log('🤖 Bot listo para recibir mensajes');
    console.log(`👤 Número autorizado: ${TU_NUMERO_AUTORIZADO}`);
});

client.on('message', async msg => {
    const remitente = msg.from.split("@")[0];
    console.log(`📨 Mensaje de ${remitente}: "${msg.body}"`);

    // Verificación opcional (descomenta para producción)
    // if (remitente !== TU_NUMERO_AUTORIZADO) {
    //     console.log('⛔ Mensaje ignorado');
    //     return await msg.reply("No estás autorizado");
    // }

    try {
        const { data } = await axios.post('http://localhost:3000/preguntar', {
            pregunta: msg.body.trim()
        });
        
        await msg.reply(data.respuesta || "Recibido");
    } catch (error) {
        console.error('Error:', error);
        await msg.reply("⚠️ Error en el servidor");
    }
});

client.initialize();