// generar_portales_empresas.js
const fs = require('fs');
const path = require('path');

const EMPRESAS = ['TCM', 'DELOSUR', 'DELGAS', 'LMT', 'MURI', 'ACB'];

// 1. Leer el archivo HTML base
const htmlContent = fs.readFileSync('index.html', 'utf8');

// 2. Extraer el bloque JSON de RAW
const startMarker = 'const RAW = ';
const startIndex = htmlContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error('No se encontró const RAW en index.html');
  process.exit(1);
}

// Localizar el cierre del objeto RAW
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

// 3. Generar la versión de cada empresa
EMPRESAS.forEach(emp => {
  console.log(Generando reporte exclusivo para: ${emp}...);

  const rawEmp = {
    EX: (rawGlobal.EX || []).filter(row => row[1] === emp),
    GE: (rawGlobal.GE || []).filter(row => row[4] === emp),
    DP: (rawGlobal.DP || []).filter(row => row[5] === emp),
    DOC: (rawGlobal.DOC || []).filter(row => row[1] === emp),
    NOM: {},
    META: { ...rawGlobal.META }
  };

  // Filtrar nominación si contiene desglose por empresa
  if (rawGlobal.NOM) {
    Object.keys(rawGlobal.NOM).forEach(m => {
      rawEmp.NOM[m] = (rawGlobal.NOM[m] || []).filter(row => row.empresa === emp || row[1] === emp);
    });
  }

  // Filtrar empMap para que solo figure ella en el desplegable
  if (rawEmp.META.empMap) {
    rawEmp.META.empMap = { [emp]: rawEmp.META.empMap[emp] || emp };
  }

  // Inyectar los datos limpios en la plantilla
  let empHtml = htmlContent.substring(0, jsonStart) + 
                JSON.stringify(rawEmp) + 
                htmlContent.substring(jsonEnd);

  // Ajustar el encabezado y fijar el estado inicial
  empHtml = empHtml.replace(
    'Informe de Desempeño<br>Empresas de Transporte Vitol Argentina',
    Informe de Desempeño<br>Transportadora ${emp} · Vitol Argentina
  );

  // Crear carpeta de la empresa y escribir su index.html
  const folder = path.join(__dirname, emp.toLowerCase());
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  fs.writeFileSync(path.join(folder, 'index.html'), empHtml, 'utf8');
});

console.log('¡Todos los enlaces de empresas han sido generados exitosamente!');
