'use strict';

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');

const FRONT_BACKGROUND = path.join(
  __dirname,
  './portada4.png'
);

const BACK_BACKGROUND = path.join(
  __dirname,
  './portada4.png'
);

const MM = (mm) => (mm * 72) / 25.4;

const CONFIG = {
  card: { width: MM(85.6), height: MM(53.98) },
  a4: { width: MM(210), height: MM(297) },

  colors: {
    navy: '#002147',
    red: '#E11D48',
    orange: '#F97316',
    gold: '#D4AF37',
    white: '#FFFFFF',
    softGray: '#F1F5F9',
    pageBg: '#F8FAFC',
  },

  layout: {
    cardsPerPage: 8,
    frontPositions: [
      { x: MM(14.4), y: MM(28.0) },
      { x: MM(110.0), y: MM(28.0) },
      { x: MM(14.4), y: MM(87.98) },
      { x: MM(110.0), y: MM(87.98) },
      { x: MM(14.4), y: MM(147.96) },
      { x: MM(110.0), y: MM(147.96) },
      { x: MM(14.4), y: MM(207.94) },
      { x: MM(110.0), y: MM(207.94) },
    ],
    backPositions: [
      // Primera configuracion de prueba para impresion duplex.
      // Si la impresora requiere ajuste, modificar solo estas coordenadas.
      { x: MM(110.0), y: MM(28.0) },
      { x: MM(14.4), y: MM(28.0) },
      { x: MM(110.0), y: MM(87.98) },
      { x: MM(14.4), y: MM(87.98) },
      { x: MM(110.0), y: MM(147.96) },
      { x: MM(14.4), y: MM(147.96) },
      { x: MM(110.0), y: MM(207.94) },
      { x: MM(14.4), y: MM(207.94) },
    ],
  },

  photo: { x: 12, y: 26, w: 62, h: 78, radius: 4 },

  qr: {
    margin: 1,
    size: 95,      // Antes era 74 (Tamaño real del QR)
    offset: { 
      x: 8,        // Reducimos x para que no choque con el borde izquierdo
      y: 20,       // Ajustamos y
      box: 100     // Antes era 80 (El cuadro blanco de fondo)
    },
  },
};

const chunkArray = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

const sanitizeCard = (data = {}) => ({
  firstName: (data.firstName || '').trim(),
  lastName: (data.lastName || '').trim(),
  phone: (data.phone || '---'),
  documentId: (data.documentId || '0000'),
  modality: (data.modality || 'NO ASIGNADO'),
  group: (data.group || 'NO ASIGNADO'),
  cycleName: (data.cycleName || 'NO ASIGNADO'),
  photoBuffer: data.photoBuffer || null,
});

const buildQRBuffer = async (text) => {
  const dataUrl = await QRCode.toDataURL(text, {
    margin: CONFIG.qr.margin,
    color: { dark: CONFIG.colors.navy, light: CONFIG.colors.white },
  });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
};

const drawCardBase = (doc) => {
  const { width, height } = CONFIG.card;

  doc.roundedRect(0, 0, width, height, 8).fill(CONFIG.colors.navy);
  doc.roundedRect(2, 2, width - 4, height - 4, 6)
    .lineWidth(0.5)
    .stroke(CONFIG.colors.gold);
};

const drawLabelValue = (doc, { x, y, label, value, width = 120 }) => {
  doc.font('Helvetica-Bold')
    .fontSize(5.5)
    .fillColor(CONFIG.colors.orange)
    .text(label.toUpperCase(), x, y, { width });

  doc.font('Helvetica')
    .fontSize(8)
    .fillColor(CONFIG.colors.white)
    .text(value, x, y + 8, { width });
};

const drawDivider = (doc, x1, x2, y, color = CONFIG.colors.gold, width = 0.5) => {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).stroke(color);
};

const drawFrontCard = (doc, cardData, ox = 0, oy = 0) => {
  
  const { width, height } = CONFIG.card;
  const { red, gold, white, orange, navy } = CONFIG.colors;
  const { photo } = CONFIG;

  doc.save().translate(ox, oy);

  drawCardBase(doc);
  try {
    // 1. Dibuja la imagen en panel derecho
    doc.save()
      .rect(160, 22, 82, width - 22)
      .clip()
      .image(FRONT_BACKGROUND, 160, 22, { width: 82, height: 110 })
      .restore();

    // 2. Degradado de fusión encima de la imagen
    const grad = doc.linearGradient(160, 0, 220, 0);
    grad.stop(0, CONFIG.colors.navy, 1);
    grad.stop(1, CONFIG.colors.navy, 0);
    doc.rect(160, 22, 60, 110).fill(grad);

  } catch (err) {
    console.log('Background error:', err);
  }
   

  doc.rect(0, 0, width, 20).fill(red);
  doc.fillColor(white)
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .text('CARNET ACADEMICO ADUNI VALLEJO', 0, 6, { width, align: 'center' });

  drawDivider(doc, 0, width, 20, gold, 1.5);

  doc.roundedRect(photo.x, photo.y, photo.w, photo.h, photo.radius)
    .lineWidth(1.5)
    .fillAndStroke(navy, gold);

  if (cardData.photoBuffer) {
    try {
      doc.save()
        .roundedRect(photo.x + 2, photo.y + 2, photo.w - 4, photo.h - 4, photo.radius - 1)
        .clip()
        .image(cardData.photoBuffer, photo.x + 2, photo.y + 2, {
          width: photo.w - 4,
          height: photo.h - 4,
          cover: [photo.w - 4, photo.h - 4],
        })
        .restore();
    } catch {
      // Mantener placeholder si falla la imagen.
    }
  } else {
    const cx = photo.x + photo.w / 2;
    const cy = photo.y + photo.h / 2;

    doc.circle(cx, cy - 16, 10).fill(gold).opacity(0.25);
    doc.ellipse(cx, cy + 10, 18, 12).fill(gold).opacity(0.25);
    doc.opacity(1);
  }

  doc.save()
    .rotate(-90, { origin: [width - 10, height / 2] })
    .font('Helvetica-Bold')
    .fontSize(30)
    .fillColor(gold)
    .opacity(0.07)
    .text('2026', width - 10, height / 2 - 15)
    .restore();

  // --- Bloque de Datos (Nombres y Apellidos separados) ---
  const dataX = photo.x + photo.w + 8;
  const dataW = width - dataX - 10;

  // Dibujar APELLIDOS
  drawLabelValue(doc, {
    x: dataX,
    y: 27,
    label: 'Apellidos',
    value: cardData.lastName.toUpperCase() || '---',
    width: dataW,
  });

  // Dibujar NOMBRES (bajamos un poco la 'y')
  drawLabelValue(doc, {
    x: dataX,
    y: 47, // Ajustado para dar espacio al apellido
    label: 'Nombres',
    value: cardData.firstName.toUpperCase() || '---',
    width: dataW,
  });

  drawDivider(doc, dataX, width - 10, 62, orange, 0.5);

  drawLabelValue(doc, {
    x: dataX,
    y: 67,
    label: 'Celular / Contacto',
    value: cardData.phone,
    width: dataW,
  });

  doc.rect(0, height - 10, width, 10).fill(navy).fillOpacity(0.6);
  doc.font('Helvetica')
    .fontSize(9)
    .fillColor(gold)
    .opacity(0.8)
    .text('Visitanos en -> www.aduniVallejoacademi.com', 0, height - 16, { width, align: 'center' })
    .opacity(1);

  doc.restore();
};

const drawBackCard = async (doc, cardData, ox = 0, oy = 0) => {
  const { width, height } = CONFIG.card;
  const { orange, navy, gold, white, softGray } = CONFIG.colors;
  const qr = CONFIG.qr.offset;

  doc.save().translate(ox, oy);

  drawCardBase(doc);
  try {
    // 1. Dibuja la imagen en panel derecho
    doc.save()
      .rect(160, 22, 82, width - 22)
      .clip()
      .image(FRONT_BACKGROUND, 160, 22, { width: 82, height: 110 })
      .restore();

    // 2. Degradado de fusión encima de la imagen
    const grad = doc.linearGradient(160, 0, 220, 0);
    grad.stop(0, CONFIG.colors.navy, 1);
    grad.stop(1, CONFIG.colors.navy, 0);
    doc.rect(160, 22, 60, 110).fill(grad);

  } catch (err) {
    console.log('Background error:', err);
  }

  doc.rect(0, 0, width, 16).fill(orange);
  doc.fillColor(navy)
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .text('INFORMACION ACADEMICA', 0, 5, { width, align: 'center' });

  drawDivider(doc, 0, width, 16, gold, 0.8);

  try {
    const qrBuffer = await buildQRBuffer(cardData.documentId);

    doc.roundedRect(qr.x, qr.y, qr.box, qr.box, 3).fill(white);
    doc.image(qrBuffer, qr.x + 3, qr.y + 3, { width: CONFIG.qr.size });

    doc.font('Helvetica-Bold')
      .fontSize(5.5)
      .fillColor(gold)
      .text(`ID USUARIO: ${cardData.documentId}`, qr.x, qr.y + qr.box + 4, {
        width: qr.box,
        align: 'center',
      });
  } catch (err) {
    console.error(`[QR Error] ID: ${cardData.documentId} ->`, err.message);
  }

  const details = [
    { label: 'Modalidad', value: cardData.modality },
    { label: 'Grupo', value: cardData.group },
    { label: 'Ciclo', value: cardData.cycleName },
  ];

  const detX = qr.x + qr.box + 12;
  const detW = width - detX - 10;

  details.forEach(({ label, value }, i) => {
    const y = 22 + i * 32;
    drawLabelValue(doc, { x: detX, y, label, value, width: detW });

    if (i < details.length - 1) {
      drawDivider(doc, detX, width - 10, y + 22, orange, 0.3);
    }
  });

  doc.fontSize(7)
    .fillColor(softGray)
    .opacity(0.7)
    .text(
      'Carnet personal  -   Academia ADUNI VALLEJO',
      0,
      height - 11,
      { width, align: 'center' }
    )
    .opacity(1);

  doc.restore();
};

const drawSheetHeader = (doc, pageLabel) => {
  const { width } = CONFIG.a4;

  doc.font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(CONFIG.colors.navy)
    .text('REPORTE DE EMISION DE CARNETS - ADUNI VALLEJO', 0, 14, {
      width,
      align: 'center',
    });

  drawDivider(doc, MM(10), width - MM(10), 30, CONFIG.colors.gold, 0.8);

  doc.font('Helvetica')
    .fontSize(7)
    .fillColor(CONFIG.colors.navy)
    .opacity(0.5)
    .text(`Generado: ${new Date().toLocaleString('es-PE')}`, 0, 34, {
      width,
      align: 'center',
    })
    .opacity(1);

  doc.font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(CONFIG.colors.navy)
    .opacity(0.7)
    .text(pageLabel, 0, 46, {
      width,
      align: 'center',
    })
    .opacity(1);
};

const drawSheetGuides = (doc, positions) => {
  const { width, height } = CONFIG.card;

  positions.forEach(({ x, y }) => {
    doc.save()
      .lineWidth(0.3)
      .dash(2, { space: 2 })
      .roundedRect(x, y, width, height, 8)
      .strokeOpacity(0.18)
      .stroke(CONFIG.colors.navy)
      .undash()
      .restore();
  });
};

const drawFrontSheetPage = (doc, batch) => {
  const { width, height } = CONFIG.a4;

  doc.rect(0, 0, width, height).fill(CONFIG.colors.pageBg);
  drawSheetHeader(doc, 'FRENTE - Pagina 1');
  drawSheetGuides(doc, CONFIG.layout.frontPositions);

  for (let i = 0; i < batch.length; i++) {
    const pos = CONFIG.layout.frontPositions[i];
    if (pos) {
      drawFrontCard(doc, batch[i], pos.x, pos.y);
    }
  }
};

const drawBackSheetPage = async (doc, batch) => {
  const { width, height } = CONFIG.a4;

  doc.rect(0, 0, width, height).fill(CONFIG.colors.pageBg);
  drawSheetHeader(doc, 'REVERSO - Pagina 2');
  drawSheetGuides(doc, CONFIG.layout.backPositions);

  for (let i = 0; i < batch.length; i++) {
    const pos = CONFIG.layout.backPositions[i];
    if (pos) {
      await drawBackCard(doc, batch[i], pos.x, pos.y);
    }
  }
};

const generateAcademicCardSheetPdf = async (cardsData, stream) => {
  if (!Array.isArray(cardsData) || cardsData.length === 0) {
    throw new Error('cardsData debe ser un array no vacio.');
  }

  if (!stream || typeof stream.write !== 'function') {
    throw new Error('stream debe ser un WritableStream valido.');
  }

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: 'Carnets Academicos - ADUNI VALLEJO',
      Author: 'Sistema de Carnets ADUNI VALLEJO',
      Subject: 'Emision de Carnets',
    },
  });

  doc.pipe(stream);

  const sanitized = cardsData.map(sanitizeCard);
  const batches = chunkArray(sanitized, CONFIG.layout.cardsPerPage);

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) {
      doc.addPage();
    }

    drawFrontSheetPage(doc, batches[i]);
    doc.addPage();
    await drawBackSheetPage(doc, batches[i]);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const generateAcademicCardPdf = async (cardData, stream) => {
  return generateAcademicCardSheetPdf([cardData], stream);
};

module.exports = {
  generateAcademicCardPdf,
  generateAcademicCardSheetPdf,
  drawFrontCard,
  drawBackCard,
  sanitizeCard,
  CONFIG,
};
