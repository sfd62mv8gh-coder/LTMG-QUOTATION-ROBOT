(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LtmgDefaultData = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    sampleProduct: {
      productModel: 'FD30',
      productName: '3 Ton Diesel Forklift',
      baseFobPrice: 5694,
      fobPort: 'Qingdao',
      quantity: 1,
      markupType: 'fixed',
      markupValue: 300,
      standardConfiguration: '3 ton load capacity, Stage III engine, 3000mm duplex mast, 1220mm forks, solid tires, LED lights, toolbox.',
      options: [
        { name: 'Side shifter', price: 206, included: true },
        { name: 'Front dual solid tires', price: 412, included: false },
        { name: '6000mm triplex full free mast', price: 1097, included: false },
      ],
    },
  };
});
