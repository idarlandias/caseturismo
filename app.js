// ========== CONSTANTES ==========
const MESES_ORDEM = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_NOME_COMPLETO = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CORES_ESTADO = { CE: '#38bdf8', RN: '#a78bfa', PE: '#fbbf24', PI: '#34d399' };
const CORES_TIPO = { Hotel: '#38bdf8', Pousada: '#fbbf24', Agencia: '#a78bfa' };
const NOMES_ESTADO = { CE: 'Ceará', RN: 'Rio Grande do Norte', PE: 'Pernambuco', PI: 'Piauí' };

// ========== ESTADO GLOBAL ==========
let dadosFiltrados = [...DADOS_TURISMO];
let charts = {};

// Desativar datalabels globalmente para não afetar outros gráficos
Chart.defaults.plugins.datalabels = { display: false };

// ========== UTILIDADES ==========
const fmt = {
    moeda: v => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    moedaCurta: v => {
        if (v >= 1e6) return 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + 'M';
        if (v >= 1e3) return 'R$ ' + (v / 1e3).toFixed(0) + 'k';
        return 'R$ ' + v.toFixed(0);
    },
    numero: v => v.toLocaleString('pt-BR'),
    pct: v => v.toFixed(1).replace('.', ',') + '%',
    nota: v => v.toFixed(1).replace('.', ',')
};

function agrupar(dados, chave) {
    return dados.reduce((acc, item) => {
        const k = item[chave];
        if (!acc[k]) acc[k] = [];
        acc[k].push(item);
        return acc;
    }, {});
}

function media(arr, campo) {
    if (!arr.length) return 0;
    return arr.reduce((s, i) => s + i[campo], 0) / arr.length;
}

function soma(arr, campo) {
    return arr.reduce((s, i) => s + i[campo], 0);
}

// ========== FILTROS ==========
function inicializarFiltros() {
    const estados = [...new Set(DADOS_TURISMO.map(d => d.estado))].sort();
    const tipos = [...new Set(DADOS_TURISMO.map(d => d.tipo))].sort();

    const selEstado = document.getElementById('filtroEstado');
    const selTipo = document.getElementById('filtroTipo');

    estados.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e;
        opt.textContent = NOMES_ESTADO[e] || e;
        selEstado.appendChild(opt);
    });

    tipos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        selTipo.appendChild(opt);
    });

    atualizarCidades();

    selEstado.addEventListener('change', () => { atualizarCidades(); aplicarFiltros(); });
    document.getElementById('filtroCidade').addEventListener('change', aplicarFiltros);
    selTipo.addEventListener('change', aplicarFiltros);
    document.getElementById('btnLimpar').addEventListener('click', limparFiltros);
}

function atualizarCidades() {
    const estado = document.getElementById('filtroEstado').value;
    const selCidade = document.getElementById('filtroCidade');
    const valorAtual = selCidade.value;

    selCidade.innerHTML = '<option value="todos">Todas as Cidades</option>';

    let cidades;
    if (estado === 'todos') {
        cidades = [...new Set(DADOS_TURISMO.map(d => d.cidade))].sort();
    } else {
        cidades = [...new Set(DADOS_TURISMO.filter(d => d.estado === estado).map(d => d.cidade))].sort();
    }

    cidades.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        selCidade.appendChild(opt);
    });

    if (cidades.includes(valorAtual)) selCidade.value = valorAtual;
}

function aplicarFiltros() {
    const estado = document.getElementById('filtroEstado').value;
    const cidade = document.getElementById('filtroCidade').value;
    const tipo = document.getElementById('filtroTipo').value;

    dadosFiltrados = DADOS_TURISMO.filter(d => {
        if (estado !== 'todos' && d.estado !== estado) return false;
        if (cidade !== 'todos' && d.cidade !== cidade) return false;
        if (tipo !== 'todos' && d.tipo !== tipo) return false;
        return true;
    });

    atualizarDashboard();
}

function limparFiltros() {
    document.getElementById('filtroEstado').value = 'todos';
    document.getElementById('filtroCidade').value = 'todos';
    document.getElementById('filtroTipo').value = 'todos';
    atualizarCidades();
    dadosFiltrados = [...DADOS_TURISMO];
    atualizarDashboard();
}

// ========== KPIs com VARIAÇÃO por Mês ==========
function atualizarKPIs() {
    document.getElementById('kpiReceita').textContent = fmt.moedaCurta(soma(dadosFiltrados, 'receita'));
    document.getElementById('kpiClientes').textContent = fmt.numero(soma(dadosFiltrados, 'clientes'));
    document.getElementById('kpiOcupacao').textContent = fmt.pct(media(dadosFiltrados, 'ocupacao'));
    document.getElementById('kpiAvaliacao').textContent = fmt.nota(media(dadosFiltrados, 'avaliacao'));

    // Calcular variação por mês
    const porMesIdx = agrupar(dadosFiltrados, 'mesIdx');
    const mesesDisp = Object.keys(porMesIdx).map(m => parseInt(m));

    if (mesesDisp.length > 1) {
        // Receita
        const receitaPorMes = mesesDisp.map(m => ({ mes: m, val: soma(porMesIdx[m], 'receita') }));
        receitaPorMes.sort((a, b) => b.val - a.val);
        const rMelhor = receitaPorMes[0], rPior = receitaPorMes[receitaPorMes.length - 1];
        document.getElementById('kpiReceitaVar').innerHTML =
            `<span class="var-melhor">▲ Melhor: ${MESES_ORDEM[rMelhor.mes]} (${fmt.moedaCurta(rMelhor.val)})</span><br><span class="var-pior">▼ Menor: ${MESES_ORDEM[rPior.mes]} (${fmt.moedaCurta(rPior.val)})</span>`;

        // Clientes
        const clientesPorMes = mesesDisp.map(m => ({ mes: m, val: soma(porMesIdx[m], 'clientes') }));
        clientesPorMes.sort((a, b) => b.val - a.val);
        const cMelhor = clientesPorMes[0], cPior = clientesPorMes[clientesPorMes.length - 1];
        document.getElementById('kpiClientesVar').innerHTML =
            `<span class="var-melhor">▲ Melhor: ${MESES_ORDEM[cMelhor.mes]} (${fmt.numero(cMelhor.val)})</span><br><span class="var-pior">▼ Menor: ${MESES_ORDEM[cPior.mes]} (${fmt.numero(cPior.val)})</span>`;

        // Ocupação
        const ocupPorMes = mesesDisp.map(m => ({ mes: m, val: media(porMesIdx[m], 'ocupacao') }));
        ocupPorMes.sort((a, b) => b.val - a.val);
        const oMelhor = ocupPorMes[0], oPior = ocupPorMes[ocupPorMes.length - 1];
        document.getElementById('kpiOcupacaoVar').innerHTML =
            `<span class="var-melhor">▲ Melhor: ${MESES_ORDEM[oMelhor.mes]} (${fmt.pct(oMelhor.val)})</span><br><span class="var-pior">▼ Menor: ${MESES_ORDEM[oPior.mes]} (${fmt.pct(oPior.val)})</span>`;

        // Avaliação
        const avalPorMes = mesesDisp.map(m => ({ mes: m, val: media(porMesIdx[m], 'avaliacao') }));
        avalPorMes.sort((a, b) => b.val - a.val);
        const aMelhor = avalPorMes[0], aPior = avalPorMes[avalPorMes.length - 1];
        document.getElementById('kpiAvaliacaoVar').innerHTML =
            `<span class="var-melhor">▲ Melhor: ${MESES_ORDEM[aMelhor.mes]} (${fmt.nota(aMelhor.val)})</span><br><span class="var-pior">▼ Menor: ${MESES_ORDEM[aPior.mes]} (${fmt.nota(aPior.val)})</span>`;
    } else {
        // Apenas 1 mês: esconder indicadores
        ['kpiReceitaVar','kpiClientesVar','kpiOcupacaoVar','kpiAvaliacaoVar'].forEach(id => {
            document.getElementById(id).innerHTML = '';
        });
    }
}

// ========== CHART CONFIG BASE ==========
const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 11, family: 'Inter' }, color: '#94a3b8' }
        },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { family: 'Inter', size: 12 },
            titleColor: '#f1f5f9',
            bodyFont: { family: 'Inter', size: 11 },
            bodyColor: '#cbd5e1',
            padding: 12,
            cornerRadius: 10,
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            displayColors: true
        },
        datalabels: { display: false }
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b' }
        },
        y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b' },
            border: { display: false }
        }
    }
};

function criarOuAtualizar(id, config) {
    if (charts[id]) {
        charts[id].destroy();
    }
    charts[id] = new Chart(document.getElementById(id), config);
}

// ========== GRÁFICO 1: Receita por Estado (Linha) ==========
function chartReceitaEstado() {
    const porEstado = agrupar(dadosFiltrados, 'estado');
    const datasets = Object.keys(porEstado).sort().map(est => {
        const porMes = agrupar(porEstado[est], 'mesAbrev');
        const valores = MESES_ORDEM.map(m => porMes[m] ? soma(porMes[m], 'receita') : 0);
        return {
            label: NOMES_ESTADO[est] || est,
            data: valores,
            borderColor: CORES_ESTADO[est],
            backgroundColor: CORES_ESTADO[est] + '20',
            borderWidth: 2.5,
            tension: 0.3,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6
        };
    });

    criarOuAtualizar('chartReceitaEstado', {
        type: 'line',
        data: { labels: MESES_ORDEM, datasets },
        options: {
            ...chartDefaults,
            scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => fmt.moedaCurta(v) } }
            },
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => ctx.dataset.label + ': ' + fmt.moeda(ctx.raw) }
                }
            }
        }
    });
}

// ========== GRÁFICO 2: Receita por Tipo (Barras) ==========
function chartReceitaTipo() {
    const porTipo = agrupar(dadosFiltrados, 'tipo');
    const items = Object.keys(porTipo).map(t => ({ tipo: t, total: soma(porTipo[t], 'receita') }));
    items.sort((a, b) => b.total - a.total);
    const labels = items.map(i => i.tipo);
    const valores = items.map(i => i.total);
    const cores = labels.map(t => CORES_TIPO[t]);

    criarOuAtualizar('chartReceitaTipo', {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: valores,
                backgroundColor: cores.map(c => c + 'CC'),
                borderColor: cores,
                borderWidth: 2,
                borderRadius: 8,
                barPercentage: 0.6
            }]
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                legend: { display: false },
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => fmt.moeda(ctx.raw) }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => fmt.moedaCurta(v) } }
            }
        }
    });
}

// ========== GRÁFICO 3: Ocupação por Cidade (Barras Horizontais) ==========
function chartOcupacaoCidade() {
    const porCidade = agrupar(dadosFiltrados, 'cidade');
    const items = Object.keys(porCidade).map(c => ({ cidade: c, media: media(porCidade[c], 'ocupacao') }));
    items.sort((a, b) => b.media - a.media);

    const cores = items.map((_, i) => {
        const t = i / Math.max(items.length - 1, 1);
        return t < 0.33 ? '#34d399' : t < 0.66 ? '#fbbf24' : '#fb7185';
    });

    criarOuAtualizar('chartOcupacaoCidade', {
        type: 'bar',
        data: {
            labels: items.map(i => i.cidade),
            datasets: [{
                data: items.map(i => i.media),
                backgroundColor: cores.map(c => c + 'CC'),
                borderColor: cores,
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.7
            }]
        },
        options: {
            ...chartDefaults,
            indexAxis: 'y',
            plugins: {
                ...chartDefaults.plugins,
                legend: { display: false },
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => fmt.pct(ctx.raw) }
                }
            },
            layout: { padding: { left: 8 } },
            scales: {
                x: { ...chartDefaults.scales.x, max: 100, ticks: { ...chartDefaults.scales.x.ticks, callback: v => v + '%' } },
                y: { ...chartDefaults.scales.y, grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b', autoSkip: false, padding: 4 }, afterFit: axis => { axis.width = window.innerWidth < 480 ? 100 : 130; } }
            }
        }
    });
}

// ========== GRÁFICO 4: Clientes por Mês (Barras) ==========
function chartClientesMes() {
    const porMes = agrupar(dadosFiltrados, 'mesAbrev');
    const valores = MESES_ORDEM.map(m => porMes[m] ? soma(porMes[m], 'clientes') : 0);

    criarOuAtualizar('chartClientesMes', {
        type: 'bar',
        data: {
            labels: MESES_ORDEM,
            datasets: [{
                data: valores,
                backgroundColor: '#38bdf8AA',
                borderColor: '#38bdf8',
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.65
            }]
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                legend: { display: false },
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => fmt.numero(ctx.raw) + ' clientes' }
                }
            },
            scales: {
                ...chartDefaults.scales,
                y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v } }
            }
        }
    });
}

// ========== GRÁFICO 5: Avaliação por Cidade (Barras Horizontais) ==========
function chartAvaliacaoCidade() {
    const porCidade = agrupar(dadosFiltrados, 'cidade');
    const items = Object.keys(porCidade).map(c => ({ cidade: c, media: media(porCidade[c], 'avaliacao') }));
    items.sort((a, b) => b.media - a.media);

    const cores = items.map(i => {
        if (i.media >= 4.3) return '#34d399';
        if (i.media >= 3.8) return '#fbbf24';
        return '#fb7185';
    });

    criarOuAtualizar('chartAvaliacaoCidade', {
        type: 'bar',
        data: {
            labels: items.map(i => i.cidade),
            datasets: [{
                data: items.map(i => i.media),
                backgroundColor: cores.map(c => c + 'CC'),
                borderColor: cores,
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.7
            }]
        },
        options: {
            ...chartDefaults,
            indexAxis: 'y',
            plugins: {
                ...chartDefaults.plugins,
                legend: { display: false },
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: { label: ctx => fmt.nota(ctx.raw) + ' / 5.0' }
                }
            },
            layout: { padding: { left: 8 } },
            scales: {
                x: { ...chartDefaults.scales.x, min: 2.5, max: 5, ticks: { ...chartDefaults.scales.x.ticks, stepSize: 0.5 } },
                y: { ...chartDefaults.scales.y, grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b', autoSkip: false, padding: 4 }, afterFit: axis => { axis.width = window.innerWidth < 480 ? 100 : 130; } }
            }
        }
    });
}

// ========== GRÁFICO 6: Scatter Receita vs Ocupação (com datalabels de cidade) ==========
function chartScatter() {
    const porTipo = agrupar(dadosFiltrados, 'tipo');
    const datasets = Object.keys(porTipo).sort().map(tipo => {
        const porCidade = agrupar(porTipo[tipo], 'cidade');
        const pontos = Object.keys(porCidade).map(c => ({
            x: media(porCidade[c], 'ocupacao'),
            y: soma(porCidade[c], 'receita') / porCidade[c].length,
            cidade: c
        }));
        return {
            label: tipo,
            data: pontos,
            backgroundColor: CORES_TIPO[tipo] + 'AA',
            borderColor: CORES_TIPO[tipo],
            borderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 10
        };
    });

    criarOuAtualizar('chartScatter', {
        type: 'scatter',
        data: { datasets },
        options: {
            ...chartDefaults,
            scales: {
                x: { ...chartDefaults.scales.x, title: { display: true, text: 'Ocupação Média (%)', font: { size: 11, family: 'Inter' } }, ticks: { ...chartDefaults.scales.x.ticks, callback: v => v + '%' } },
                y: { ...chartDefaults.scales.y, title: { display: true, text: 'Receita Média (R$)', font: { size: 11, family: 'Inter' } }, ticks: { ...chartDefaults.scales.y.ticks, callback: v => fmt.moedaCurta(v) } }
            },
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: {
                        title: ctxs => ctxs[0].raw.cidade || '',
                        label: ctx => ctx.dataset.label + ': ' + fmt.pct(ctx.raw.x) + ' ocupação, ' + fmt.moeda(ctx.raw.y) + ' receita'
                    }
                },
                // Ativar datalabels APENAS no scatter
                datalabels: {
                    display: true,
                    formatter: (value) => value.cidade,
                    color: '#94a3b8',
                    font: { size: 9, family: 'Inter' },
                    anchor: 'end',
                    align: 'top',
                    offset: 4
                }
            }
        }
    });
}

// ========== GRÁFICO 7: Donut de Participação por Estado ==========
function chartDonutEstado() {
    const porEstado = agrupar(dadosFiltrados, 'estado');
    const estados = Object.keys(porEstado).sort();
    const totais = estados.map(e => soma(porEstado[e], 'receita'));
    const totalGeral = totais.reduce((a, b) => a + b, 0);
    const cores = estados.map(e => CORES_ESTADO[e] || '#64748b');

    criarOuAtualizar('chartDonutEstado', {
        type: 'doughnut',
        data: {
            labels: estados.map(e => NOMES_ESTADO[e] || e),
            datasets: [{
                data: totais,
                backgroundColor: cores.map(c => c + 'CC'),
                borderColor: cores,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 10, family: 'Inter' }, color: '#94a3b8' }
                },
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: {
                        label: ctx => {
                            const pct = ((ctx.raw / totalGeral) * 100).toFixed(1).replace('.', ',');
                            return ` ${ctx.label}: ${fmt.moedaCurta(ctx.raw)} (${pct}%)`;
                        }
                    }
                },
                datalabels: { display: false }
            }
        }
    });
}

// ========== GRÁFICO 8: Donut de Participação por Tipo ==========
function chartDonutTipo() {
    const porTipo = agrupar(dadosFiltrados, 'tipo');
    const tipos = Object.keys(porTipo).sort();
    const totais = tipos.map(t => soma(porTipo[t], 'receita'));
    const totalGeral = totais.reduce((a, b) => a + b, 0);
    const cores = tipos.map(t => CORES_TIPO[t] || '#64748b');

    criarOuAtualizar('chartDonutTipo', {
        type: 'doughnut',
        data: {
            labels: tipos,
            datasets: [{
                data: totais,
                backgroundColor: cores.map(c => c + 'CC'),
                borderColor: cores,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 10, family: 'Inter' }, color: '#94a3b8' }
                },
                tooltip: {
                    ...chartDefaults.plugins.tooltip,
                    callbacks: {
                        label: ctx => {
                            const pct = ((ctx.raw / totalGeral) * 100).toFixed(1).replace('.', ',');
                            return ` ${ctx.label}: ${fmt.moedaCurta(ctx.raw)} (${pct}%)`;
                        }
                    }
                },
                datalabels: { display: false }
            }
        }
    });
}

// ========== RESUMO RÁPIDO ==========
function atualizarResumoRapido() {
    const container = document.getElementById('resumoRapidoBody');
    if (!dadosFiltrados.length) { container.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:20px">Nenhum dado disponível</p>'; return; }

    // Cidade com maior receita
    const porCidade = agrupar(dadosFiltrados, 'cidade');
    const cidadeReceitas = Object.keys(porCidade).map(c => ({ cidade: c, total: soma(porCidade[c], 'receita') }));
    cidadeReceitas.sort((a, b) => b.total - a.total);
    const cidadeTopReceita = cidadeReceitas[0];

    // Tipo mais avaliado
    const porTipo = agrupar(dadosFiltrados, 'tipo');
    const tipoAval = Object.keys(porTipo).map(t => ({ tipo: t, media: media(porTipo[t], 'avaliacao') }));
    tipoAval.sort((a, b) => b.media - a.media);
    const topTipo = tipoAval[0];

    // Mês de pico
    const porMesIdx = agrupar(dadosFiltrados, 'mesIdx');
    const mesPicos = Object.keys(porMesIdx).map(m => ({ mes: parseInt(m), total: soma(porMesIdx[m], 'receita') }));
    mesPicos.sort((a, b) => b.total - a.total);
    const mesPico = mesPicos[0];

    container.innerHTML = `
        <div class="resumo-item">
            <div class="resumo-icon" style="background:rgba(56,189,248,.12);color:#38bdf8">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
                <div class="resumo-label">Maior Receita</div>
                <div class="resumo-valor">${cidadeTopReceita.cidade} <span>${fmt.moedaCurta(cidadeTopReceita.total)}</span></div>
            </div>
        </div>
        <div class="resumo-item">
            <div class="resumo-icon" style="background:rgba(167,139,250,.12);color:#a78bfa">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
                <div class="resumo-label">Tipo Mais Avaliado</div>
                <div class="resumo-valor">${topTipo.tipo} <span>${fmt.nota(topTipo.media)}/5</span></div>
            </div>
        </div>
        <div class="resumo-item">
            <div class="resumo-icon" style="background:rgba(251,191,36,.12);color:#fbbf24">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div>
                <div class="resumo-label">Mês de Pico</div>
                <div class="resumo-valor">${MESES_NOME_COMPLETO[mesPico.mes]} <span>${fmt.moedaCurta(mesPico.total)}</span></div>
            </div>
        </div>
        <div class="resumo-item">
            <div class="resumo-icon" style="background:rgba(52,211,153,.12);color:#34d399">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
            <div>
                <div class="resumo-label">Total de Registros</div>
                <div class="resumo-valor">${fmt.numero(dadosFiltrados.length)} <span>registros</span></div>
            </div>
        </div>
    `;

}

// ========== INSIGHTS DINÂMICOS ==========
function gerarInsights() {
    const container = document.getElementById('insightsBody');
    const insights = [];

    // Melhor estado em receita
    const porEstado = agrupar(dadosFiltrados, 'estado');
    const estadoReceita = Object.keys(porEstado).map(e => ({ estado: e, total: soma(porEstado[e], 'receita') }));
    estadoReceita.sort((a, b) => b.total - a.total);
    if (estadoReceita.length > 1) {
        const melhor = estadoReceita[0];
        const pctTotal = (melhor.total / soma(dadosFiltrados, 'receita') * 100);
        insights.push({
            cor: CORES_ESTADO[melhor.estado],
            texto: `<span class="insight-highlight">${NOMES_ESTADO[melhor.estado] || melhor.estado}</span> lidera em receita com ${fmt.moeda(melhor.total)}, representando <span class="insight-highlight">${pctTotal.toFixed(1).replace('.', ',')}%</span> do faturamento total.`
        });
    }

    // Melhor cidade em ocupação
    const porCidade = agrupar(dadosFiltrados, 'cidade');
    const cidadeOcup = Object.keys(porCidade).map(c => ({ cidade: c, media: media(porCidade[c], 'ocupacao') }));
    cidadeOcup.sort((a, b) => b.media - a.media);
    if (cidadeOcup.length > 0) {
        const top = cidadeOcup[0];
        const bottom = cidadeOcup[cidadeOcup.length - 1];
        insights.push({
            cor: '#10b981',
            texto: `<span class="insight-highlight">${top.cidade}</span> tem a maior taxa de ocupação média (${fmt.pct(top.media)}), enquanto <span class="insight-highlight">${bottom.cidade}</span> apresenta a menor (${fmt.pct(bottom.media)}) — uma diferença de ${fmt.pct(top.media - bottom.media)} pontos percentuais.`
        });
    }

    // Tipo mais rentável
    const porTipo = agrupar(dadosFiltrados, 'tipo');
    const tipoReceita = Object.keys(porTipo).map(t => ({ tipo: t, media: soma(porTipo[t], 'receita') / porTipo[t].length }));
    tipoReceita.sort((a, b) => b.media - a.media);
    if (tipoReceita.length > 1) {
        insights.push({
            cor: CORES_TIPO[tipoReceita[0].tipo],
            texto: `O segmento <span class="insight-highlight">${tipoReceita[0].tipo}</span> apresenta a maior receita média por unidade (${fmt.moeda(tipoReceita[0].media)}), sugerindo maior potencial de retorno por empreendimento.`
        });
    }

    // Sazonalidade
    const porMes = agrupar(dadosFiltrados, 'mesIdx');
    const mesReceita = Object.keys(porMes).map(m => ({ mes: parseInt(m), total: soma(porMes[m], 'receita') }));
    mesReceita.sort((a, b) => b.total - a.total);
    if (mesReceita.length > 1) {
        const melhorMes = MESES_ORDEM[mesReceita[0].mes];
        const piorMes = MESES_ORDEM[mesReceita[mesReceita.length - 1].mes];
        insights.push({
            cor: '#f59e0b',
            texto: `A sazonalidade mostra que <span class="insight-highlight">${melhorMes}</span> é o mês de maior faturamento e <span class="insight-highlight">${piorMes}</span> o de menor, indicando oportunidades de ações promocionais em períodos de baixa.`
        });
    }

    // Melhor avaliação
    const cidadeAval = Object.keys(porCidade).map(c => ({ cidade: c, media: media(porCidade[c], 'avaliacao') }));
    cidadeAval.sort((a, b) => b.media - a.media);
    if (cidadeAval.length > 0) {
        insights.push({
            cor: '#8b5cf6',
            texto: `<span class="insight-highlight">${cidadeAval[0].cidade}</span> destaca-se na satisfação do cliente com nota média ${fmt.nota(cidadeAval[0].media)}/5, um indicador importante para fidelização e marketing boca-a-boca.`
        });
    }

    container.innerHTML = insights.map(i => `
        <div class="insight-item">
            <div class="insight-dot" style="background:${i.cor}"></div>
            <div class="insight-text">${i.texto}</div>
        </div>
    `).join('');
}

// ========== ATUALIZAR TUDO ==========
function atualizarDashboard() {
    atualizarKPIs();
    chartDonutEstado();
    chartDonutTipo();
    atualizarResumoRapido();
    chartReceitaEstado();
    chartReceitaTipo();
    chartOcupacaoCidade();
    chartClientesMes();
    chartAvaliacaoCidade();
    chartScatter();
    gerarInsights();
}

// ========== EXPORTAÇÃO PDF (html2canvas + jsPDF) ==========
function exportarPDF() {
    const overlay = document.getElementById('pdfOverlay');
    overlay.classList.add('ativo');

    // Esconder filtros e botões no PDF
    const filtersSection = document.querySelector('.filters-section');
    filtersSection.style.display = 'none';

    setTimeout(() => {
        html2canvas(document.body, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#0b0f19',
            logging: false
        }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            const ratio = canvasWidth / pageWidth;
            const totalPdfHeight = canvasHeight / ratio;
            let posY = 0;

            while (posY < totalPdfHeight) {
                if (posY > 0) pdf.addPage();

                const srcY = posY * ratio;
                const srcHeight = Math.min(pageHeight * ratio, canvasHeight - srcY);

                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = canvasWidth;
                sliceCanvas.height = srcHeight;
                const sliceCtx = sliceCanvas.getContext('2d');
                sliceCtx.drawImage(canvas, 0, srcY, canvasWidth, srcHeight, 0, 0, canvasWidth, srcHeight);

                const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
                const sliceHeightMm = srcHeight / ratio;
                pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, sliceHeightMm);

                posY += pageHeight;
            }

            pdf.save('dashboard_turismo_nordeste.pdf');
        }).catch(err => {
            console.error('Erro ao gerar PDF:', err);
            alert('Erro ao gerar PDF. Tente novamente.');
        }).finally(() => {
            filtersSection.style.display = '';
            overlay.classList.remove('ativo');
        });
    }, 200);
}

// ========== EXPORTAÇÃO EXCEL ==========
function exportarExcel() {
    // meses já estão em português no dados.js, ordenar por mesIdx
    const mesesOrdemIdx = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    // Aba 1: Dados completos (filtrados)
    const dadosExport = dadosFiltrados
        .sort((a, b) => a.mesIdx - b.mesIdx || a.estado.localeCompare(b.estado) || a.cidade.localeCompare(b.cidade))
        .map(d => ({
            'Mês': d.mes,
            'Estado': NOMES_ESTADO[d.estado] || d.estado,
            'Cidade': d.cidade,
            'Tipo': d.tipo,
            'Receita (R$)': d.receita,
            'Clientes': d.clientes,
            'Ocupação (%)': d.ocupacao,
            'Avaliação (1-5)': d.avaliacao
        }));

    // Aba 2: Resumo por Estado
    const porEstado = agrupar(dadosFiltrados, 'estado');
    const resumoEstado = Object.keys(porEstado).sort().map(e => ({
        'Estado': NOMES_ESTADO[e] || e,
        'Receita Total (R$)': Math.round(soma(porEstado[e], 'receita')),
        'Total Clientes': soma(porEstado[e], 'clientes'),
        'Ocupação Média (%)': Math.round(media(porEstado[e], 'ocupacao') * 10) / 10,
        'Avaliação Média': Math.round(media(porEstado[e], 'avaliacao') * 10) / 10,
        '% Receita Total': Math.round(soma(porEstado[e], 'receita') / soma(dadosFiltrados, 'receita') * 1000) / 10
    }));

    // Aba 3: Resumo por Cidade
    const porCidade = agrupar(dadosFiltrados, 'cidade');
    const resumoCidade = Object.keys(porCidade).sort().map(c => {
        const items = porCidade[c];
        const estado = items[0].estado;
        return {
            'Cidade': c,
            'Estado': NOMES_ESTADO[estado] || estado,
            'Receita Total (R$)': Math.round(soma(items, 'receita')),
            'Total Clientes': soma(items, 'clientes'),
            'Ocupação Média (%)': Math.round(media(items, 'ocupacao') * 10) / 10,
            'Avaliação Média': Math.round(media(items, 'avaliacao') * 10) / 10
        };
    });

    // Aba 4: Resumo por Tipo
    const porTipo = agrupar(dadosFiltrados, 'tipo');
    const resumoTipo = Object.keys(porTipo).sort().map(t => ({
        'Tipo': t,
        'Receita Total (R$)': Math.round(soma(porTipo[t], 'receita')),
        'Receita Média (R$)': Math.round(soma(porTipo[t], 'receita') / porTipo[t].length),
        'Total Clientes': soma(porTipo[t], 'clientes'),
        'Ocupação Média (%)': Math.round(media(porTipo[t], 'ocupacao') * 10) / 10,
        'Avaliação Média': Math.round(media(porTipo[t], 'avaliacao') * 10) / 10
    }));

    // Aba 5: Resumo Mensal (ordenado por mesIdx)
    const porMes = agrupar(dadosFiltrados, 'mes');
    const resumoMensal = mesesOrdemIdx.filter(m => porMes[m]).map(m => ({
        'Mês': m,
        'Receita Total (R$)': Math.round(soma(porMes[m], 'receita')),
        'Total Clientes': soma(porMes[m], 'clientes'),
        'Ocupação Média (%)': Math.round(media(porMes[m], 'ocupacao') * 10) / 10,
        'Avaliação Média': Math.round(media(porMes[m], 'avaliacao') * 10) / 10
    }));

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(dadosExport);
    ws1['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Dados Completos');

    const ws2 = XLSX.utils.json_to_sheet(resumoEstado);
    ws2['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Estado');

    const ws3 = XLSX.utils.json_to_sheet(resumoCidade);
    ws3['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Cidade');

    const ws4 = XLSX.utils.json_to_sheet(resumoTipo);
    ws4['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Por Tipo');

    const ws5 = XLSX.utils.json_to_sheet(resumoMensal);
    ws5['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws5, 'Por Mês');

    XLSX.writeFile(wb, 'relatorio_turismo_nordeste.xlsx');
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    inicializarFiltros();
    atualizarDashboard();

    document.getElementById('btnPDF').addEventListener('click', exportarPDF);
    document.getElementById('btnExcel').addEventListener('click', exportarExcel);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => atualizarDashboard(), 250);
    });
});
