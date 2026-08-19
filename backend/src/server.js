// Importación de la instancia de la aplicación Express desde el archivo app.js.
// Esto separa la configuración de la aplicación de la lógica del servidor.
const app = require('./app');

// Definición del puerto en el que correrá el servidor.
// Intenta tomar el puerto de las variables de entorno (ideal para producción).
// Si no está definida, usa el puerto 4000 por defecto (ideal para desarrollo).
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

// Inicia el servidor para que escuche peticiones en el puerto especificado.
app.listen(PORT, HOST, () => {
  // Imprime un mensaje en la consola una vez que el servidor se ha iniciado correctamente.
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
