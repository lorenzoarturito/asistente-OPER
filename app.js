require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// Configuración
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Subida de archivos .txt
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'datos')),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Función para dividir texto
const dividirTexto = (texto, maxLength = 4000) => {
    const chunks = [];
    for (let i = 0; i < texto.length; i += maxLength) {
        chunks.push(texto.slice(i, i + maxLength));
    }
    return chunks;
};

// Procesar documentos grandes
const procesarDocumentos = async () => {
    try {
        const carpeta = path.join(__dirname, 'datos');
        const archivos = fs.readdirSync(carpeta).filter(f => f.endsWith('.txt')).slice(0, 10);

        let contexto = '';
        for (const archivo of archivos) {
            const contenido = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
            const chunks = dividirTexto(contenido);

            for (const chunk of chunks.slice(0, 3)) {
                contexto += `\n[Fragmento de ${archivo}]: ${chunk}`;
                if (contexto.length > 5000) break;
            }
        }
        return contexto.slice(0, 8000);
    } catch (error) {
        console.error('Error procesando documentos:', error);
        return '';
    }
};

// Rutas
app.get('/', (req, res) => {
    const archivos = fs.readdirSync(path.join(__dirname, 'datos')).filter(f => f.endsWith('.txt'));
    res.render('index', { respuesta: null, error: null, archivos });
});

app.post('/preguntar', async (req, res) => {
    try {
        const contexto = await procesarDocumentos();
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [
                    { role: "system", content: "Responde CONCISAMENTE basándote en esta información:\n" + contexto },
                    { role: "user", content: `Pregunta: ${req.body.pregunta}\n\nRespuesta breve (máximo 2 párrafos):` }
                ],
                temperature: 0.3,
                max_tokens: 600
            })
        });

        const data = await response.json();
        const archivos = fs.readdirSync(path.join(__dirname, 'datos')).filter(f => f.endsWith('.txt'));
        res.render('index', { respuesta: data.choices[0].message.content, error: null, archivos });
    } catch (error) {
        const archivos = fs.readdirSync(path.join(__dirname, 'datos')).filter(f => f.endsWith('.txt'));
        res.render('index', { respuesta: null, error: '❌ ' + error.message, archivos });
    }
});

app.post('/subir', upload.single('documento'), (req, res) => {
    return res.redirect('/');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor listo: http://localhost:${PORT}`));