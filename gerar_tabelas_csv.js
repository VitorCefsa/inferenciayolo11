const fs = require("fs");
const path = require("path");

const arquivos = fs.readdirSync(__dirname).filter(f => /^modelo_\d+\.json$/.test(f));
const tabelaResumo = [];
const tabelaDetalhes = [];

// Cabeçalhos
tabelaResumo.push("modelo;total_imagens;imagens_com_deteccao;porcentagem_acerto;media_confiança;erro_medio;tempo_medio_ms;desvio_padrao_tempo_ms");
tabelaDetalhes.push("modelo;imagem;confidence;x;y;largura;altura;tempo_ms");

for (const arquivo of arquivos) {
    const caminho = path.join(__dirname, arquivo);
    const dados = JSON.parse(fs.readFileSync(caminho, "utf8"));
    const modelo = dados.modelo;

    // Tabela de resumo
    tabelaResumo.push([
        modelo,
        dados.total_imagens,
        dados.imagens_com_deteccao,
        dados.porcentagem_acerto,
        dados.media_confiança,
        dados.erro_medio ?? dados.imagens_erro_medio ?? "", // compatível com modelo 4 ou anteriores
        dados.tempo_medio_ms,
        dados.desvio_padrao_tempo_ms
    ].join(";"));

    // Mapear tempos por imagem
    const tempos = dados.tempos_ms;
    const temposPorImagem = tempos.map((t, i) => ({
        nome: `${i + 1}.jpg`,
        tempo: t
    }));

    // Tabela por detecção
    if (Array.isArray(dados.detecções)) {
        dados.detecções.forEach(det => {
            const tempoImg = temposPorImagem.find(t => t.nome === det.imagem)?.tempo || "";
            tabelaDetalhes.push([
                modelo,
                det.imagem,
                det.confidence,
                det.x,
                det.y,
                det.largura,
                det.altura,
                tempoImg
            ].join(";"));
        });
    }
}

// Salvar arquivos
fs.writeFileSync("tabela_modelos.csv", tabelaResumo.join("\n"), "utf8");
fs.writeFileSync("tabela_detalhes.csv", tabelaDetalhes.join("\n"), "utf8");

console.log("✅ tabelas salvas: tabela_modelos.csv e tabela_detalhes.csv");
