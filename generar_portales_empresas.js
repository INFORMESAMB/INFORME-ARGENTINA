
const fs = require('fs');
const path = require('path');

const EMPRESAS = ['TCM', 'DELOSUR', 'DELGAS', 'LMT', 'MURI', 'ACB'];

const htmlContent = fs.readFileSync('/tmp/index.html', 'utf8');

const startMarker = 'const RAW = ';
const startIndex = htmlContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error('No se encontro const RAW');
  process.exit(1);
}

let depth = 0;
let jsonStart = startIndex + startMarker.length;
let jsonEnd = -1;
for (let i = jsonStart; i < htmlContent.length; i++) {
  if (htmlContent[i] === '{') depth++;
  else if (htmlContent[i] === '}') {
    depth--;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
}

const rawGlobal = JSON.parse(htmlContent.substring(jsonStart, jsonEnd));

EMPRESAS.forEach(emp => {
  const rawEmp = {
    EX: (rawGlobal.EX || []).filter(row => row[1] === emp),
    GE: (rawGlobal.GE || []).filter(row => row[4] === emp),
    DP: (rawGlobal.DP || []).filter(row => row[5] === emp),
    DOC: (rawGlobal.DOC || []).filter(row => row[1] === emp),
    NOM: {},
    META: JSON.parse(JSON.stringify(rawGlobal.META || {}))
  };

  if (rawGlobal.NOM) {
    Object.keys(rawGlobal.NOM).forEach(mes => {
      const nomMes = rawGlobal.NOM[mes];
      if (nomMes && nomMes.tablas) {
        const tablasFiltradas = nomMes.tablas.map(t => {
          const newRows = {};
          if (t.rows && t.rows[emp]) {
            newRows[emp] = t.rows[emp];
          }
          return {
            metrica: t.metrica,
            cols: t.cols,
            rows: newRows,
            total: (t.rows && t.rows[emp]) ? { ...t.rows[emp] } : (t.total || {})
          };
        });
        rawEmp.NOM[mes] = {
          archivo: nomMes.archivo,
          tablas: tablasFiltradas,
          validador: nomMes.validador
        };
      } else {
        rawEmp.NOM[mes] = nomMes;
      }
    });
  }

  if (rawEmp.META && rawEmp.META.empMap) {
    rawEmp.META.empMap = { [emp]: rawEmp.META.empMap[emp] || emp };
  }

  let empHtml = htmlContent.substring(0, jsonStart) + 
                JSON.stringify(rawEmp) + 
                htmlContent.substring(jsonEnd);

  empHtml = empHtml.replace(
    'Informe de Desempeño<br>Empresas de Transporte Vitol Argentina',
    'Informe de Desempeño<br>Transportadora ' + emp + ' · Vitol Argentina'
  );

  const folder = path.join('/tmp/portales', emp.toLowerCase());
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'), empHtml, 'utf8');
  console.log('Creado exitosamente: ' + emp.toLowerCase() + '/index.html (Registros EX: ' + rawEmp.EX.length + ', DP: ' + rawEmp.DP.length + ', GE: ' + rawEmp.GE.length + ')');
});
