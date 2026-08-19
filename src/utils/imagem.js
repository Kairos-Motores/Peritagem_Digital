// Reduz a resolução/tamanho de uma foto antes de guardar em memória ou enviar.
// Fotos de câmeras de celulares atuais (ex.: 12-50MP) geram arquivos de vários MB;
// em base64 isso passa de 5-10MB de texto por foto, e algumas fotos acumuladas em
// memória (estado do React + IndexedDB) derrubam a aba por falta de memória em
// aparelhos com WebView mais restrita. Reamostrando para no máximo ~1600px no
// lado maior e recomprimindo como JPEG, o arquivo cai para algumas centenas de KB.
export function comprimirImagem(file, { maxDimensao = 1600, qualidade = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimensao || height > maxDimensao) {
        if (width > height) {
          height = Math.round((height * maxDimensao) / width);
          width = maxDimensao;
        } else {
          width = Math.round((width * maxDimensao) / height);
          height = maxDimensao;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', qualidade));
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}
