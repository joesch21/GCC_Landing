document.querySelectorAll('img[data-product-image]').forEach((img) => {
  const handleError = () => {
    const media = img.closest('.product-media, .hero-media');
    if (media) media.classList.add('image-failed');
    img.hidden = true;
  };

  img.addEventListener('error', handleError);

  if (img.complete && img.naturalWidth === 0) {
    handleError();
  }
});
