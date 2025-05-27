const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_URL = "https://serverless.roboflow.com/smartfirewatch_modelo_2/1";
const API_KEY = "H8ZX6BgARrnWxbwjHfhu";
const CONFIDENCE_THRESHOLD = 0.09;
const IMAGE_FOLDER = path.join(__dirname, "images");

const resultado = {
    modelo: "smartfirewatch_modelo_2/1",
    total_imagens: 0,
    imagens_com_deteccao: 0,
    porcentagem_acerto: 0,
    media_confiança: 0,
    imagens_erro_medio: 0,
    tempo_medio_ms: 0,
    desvio_padrao_tempo_ms: 0,
    confiancas: [],
    tempos_ms: [],
    detecções: [] // novo campo para registrar cada detecção
};

function calcularMedia(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calcularDesvioPadrao(arr) {
    const media = calcularMedia(arr);
    const variancia = arr.reduce((soma, val) => soma + Math.pow(val - media, 2), 0) / arr.length;
    return Math.sqrt(variancia);
}

fs.readdir(IMAGE_FOLDER, async (err, files) => {
    if (err) return console.error("Erro ao ler pasta:", err);

    const images = files.filter(file =>
        /\.(jpg|jpeg|png)$/i.test(file)
    );

    resultado.total_imagens = images.length;

    for (const imageFile of images) {
        const filePath = path.join(IMAGE_FOLDER, imageFile);
        const imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

        try {
            const start = Date.now();

            const response = await axios({
                method: "POST",
                url: API_URL,
                params: {
                    api_key: API_KEY,
                    confidence: CONFIDENCE_THRESHOLD
                },
                data: imageBase64,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            const end = Date.now();
            const tempo = end - start;

            resultado.tempos_ms.push(tempo);

            const predictions = response.data.predictions;

            if (predictions.length > 0) {
                resultado.imagens_com_deteccao++;
                predictions.forEach(pred => {
                    resultado.confiancas.push(pred.confidence);
                    resultado.detecções.push({
                        imagem: imageFile,
                        confidence: pred.confidence,
                        x: pred.x,
                        y: pred.y,
                        largura: pred.width,
                        altura: pred.height
                    });
                });
            }

        } catch (error) {
            console.error(`Erro ao processar ${imageFile}:`, error.message);
        }
    }

    const media = calcularMedia(resultado.confiancas);
    resultado.media_confiança = Number(media.toFixed(4));
    resultado.imagens_erro_medio = Number((1 - media).toFixed(4));
    resultado.porcentagem_acerto = Number(((resultado.imagens_com_deteccao / resultado.total_imagens) * 100).toFixed(2));
    resultado.tempo_medio_ms = Number(calcularMedia(resultado.tempos_ms).toFixed(2));
    resultado.desvio_padrao_tempo_ms = Number(calcularDesvioPadrao(resultado.tempos_ms).toFixed(2));

    fs.writeFileSync(
        path.join(__dirname, "modelo_2.json"),
        JSON.stringify(resultado, null, 4),
        "utf-8"
    );

    console.log("\n✅ Resultado salvo em modelo_2.json");
});
