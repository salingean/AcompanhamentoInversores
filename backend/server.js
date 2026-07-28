import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const plantas = [
    { db: 'DIV I', id: 'div-1', name: 'UFV DIV I' },
    { db: 'DIV II', id: 'div-2', name: 'UFV DIV II' },
    { db: 'LAP I', id: 'lap-1', name: 'UFV LAP I' },
    { db: 'LAP II', id: 'lap-2', name: 'UFV LAP II' },
    { db: 'SGA I', id: 'sga-1', name: 'UFV SGA I' },
    { db: 'SGA II', id: 'sga-2', name: 'UFV SGA II' },
    { db: 'SGA III', id: 'sga-3', name: 'UFV SGA III' }
];

async function getDadosPlanta(planta, startDate, endDate, startTime, endTime) {
    try {
        const pool = new sql.ConnectionPool({ ...dbConfig, database: planta.db });
        await pool.connect();
        
        // Procurar a tabela que contém Inversores (ex: DIV-1_Inversores, Inversores) e não Geração Diária ou Fields
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE '%Inversores' 
              AND TABLE_NAME NOT LIKE '%Fields%' 
              AND TABLE_NAME NOT LIKE '%Diária%'
        `);
        
        if (tablesResult.recordset.length === 0) {
            pool.close();
            return null;
        }

        const tableName = tablesResult.recordset[0].TABLE_NAME;

        let startDStr = startDate;
        let endDStr = endDate;
        if (!startDStr || startDStr === 'undefined') {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            startDStr = `${y}-${m}-${d}`;
            endDStr = startDStr;
        }
        if (!endDStr || endDStr === 'undefined') {
            endDStr = startDStr;
        }

        const startTimeStr = `${startTime}:00`;
        const endTimeStr = `${endTime}:59`;

        // Pegar todos os registros da data e horário selecionados
        // Subtraímos 3 horas do E3TimeStamp para converter UTC para Horário de Brasília
        const dataResult = await pool.request().query(`
            SELECT * 
            FROM "${tableName}"
            WHERE E3TimeStamp >= '${startDStr} ${startTimeStr}'
              AND E3TimeStamp <= '${endDStr} ${endTimeStr}'
            ORDER BY E3TimeStamp ASC
        `);

        if (dataResult.recordset.length === 0) {
            pool.close();
            return {
                id: planta.id,
                name: `Potência Inversores - ${planta.name}`,
                stats: { power: '0 MW', accumulated: '0 MW' },
                series: [{ name: 'Sem Dados', data: [] }]
            };
        }

        const excludedKeywords = ['e3timestamp', '_quality', 'temperatura', 'vento', 'pluviometro', 'energia', 'total', 'diária', 'smartlogger', 'potência', 'cmp', 'acumulada', 'acumulado'];
        
        const columns = Object.keys(dataResult.recordset[0]).filter(col => {
            const colLower = col.toLowerCase();
            if (excludedKeywords.some(keyword => colLower.includes(keyword))) return false;
            
            // Filtra métricas solares (Irradiação, Radiação, Piranometro)
            const isSolarMetric = colLower.includes('irradia') || colLower.includes('radia') || colLower.includes('piran');
            if (isSolarMetric) {
                const isPOA1 = colLower.includes('poa1') || colLower.includes('poa 1') || colLower.includes('poa_1');
                const isPiranometro2 = colLower.includes('piran') && colLower.includes('2');
                
                // Só permite se for explicitamente POA1 ou Piranometro 2
                if (!isPOA1 && !isPiranometro2) {
                    return false;
                }
            }
            
            return true;
        });

        const series = columns.map(col => {
            return {
                name: col,
                data: dataResult.recordset.map(row => {
                    const d = new Date(row.E3TimeStamp);
                    d.setHours(d.getHours() + 3); // Compensa o fuso horário (UTC -> BRT) para o gráfico
                    return [d.getTime(), row[col] || 0];
                })
            };
        });

        const lastRow = dataResult.recordset[dataResult.recordset.length - 1];
        
        const dailyKeys = Object.keys(lastRow).filter(k => k.toLowerCase().includes('diária') && !k.endsWith('_Quality'));
        const irradKeys = Object.keys(lastRow).filter(k => k.toLowerCase().includes('irradiação') && k.toLowerCase().includes('acumulada') && k.toLowerCase().includes('poa') && !k.endsWith('_Quality'));
        
        if (irradKeys.length === 0) {
            // fallback to GHI
            const ghiKeys = Object.keys(lastRow).filter(k => k.toLowerCase().includes('irradiação') && k.toLowerCase().includes('acumulada') && !k.endsWith('_Quality'));
            if (ghiKeys.length > 0) irradKeys.push(ghiKeys[0]);
        }

        let dailyEnergy = 0;
        if (dailyKeys.length > 0) dailyEnergy = lastRow[dailyKeys[0]];

        let totalIrrad = 0;
        if (irradKeys.length > 0) {
            const irradKey = irradKeys[0];
            const irradValues = dataResult.recordset
                .map(row => row[irradKey])
                .filter(val => val !== null && val !== undefined && !isNaN(val));
            if (irradValues.length > 0) {
                const maxIrrad = Math.max(...irradValues);
                const minIrrad = Math.min(...irradValues);
                totalIrrad = maxIrrad - minIrrad;
            }
        }

        pool.close();

        return {
            id: planta.id,
            name: `Potência Inversores - ${planta.name}`,
            stats: { 
                power: dailyEnergy ? `${(dailyEnergy/1000).toFixed(2)} MW` : 'N/A', 
                accumulated: totalIrrad ? `${totalIrrad.toFixed(2)} kW/m²` : 'N/A' 
            },
            series: series
        };

    } catch (err) {
        console.error(`Erro ao processar ${planta.name}:`, err.message);
        return null;
    }
}

app.get('/api/inversores', async (req, res) => {
    try {
        const startDate = req.query.startDate || req.query.date;
        const endDate = req.query.endDate || req.query.date;
        const targetId = req.query.id;
        const startTime = req.query.startTime || '00:00';
        const endTime = req.query.endTime || '23:59';
        
        let plantasParaBuscar = plantas;
        if (targetId) {
            plantasParaBuscar = plantas.filter(p => p.id == targetId);
        }

        const results = [];
        for (const planta of plantasParaBuscar) {
            console.log(`Buscando dados da planta ${planta.name}...`);
            const result = await getDadosPlanta(planta, startDate, endDate, startTime, endTime);
            if (result) results.push(result);
        }
        console.log('Dados buscados com sucesso, retornando ao frontend.');
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
    console.log(`Conectado no SQL Server 192.168.50.200 com sucesso.`);
});
