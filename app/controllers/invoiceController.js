exports.invoiceDownload = async (req, res) => {
  const {
      orderId,
      productDetails,
      totalPrice,
      totalOfferPrice,
      deliveryCharge,
      packingCharge,
      totalAmount,
      userAddress
  } = req.body;

  try {
      // Create a PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Set the response header to download the file
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');

      // Stream the document to the response
      doc.pipe(res);

      // Add header with invoice details and address on the same row
      doc.fontSize(16).text('Invoice', { align: 'left' });
      doc.fontSize(12).text(`Invoice Number: ${orderId}`, { align: 'left' });
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, { align: 'left' });

      // Add a line below the header
     

      // Add user address on the same row as the invoice details
      doc.fontSize(14).text('User Address', { align: 'right' });
      doc.fontSize(12).text(userAddress, { align: 'right' });
      doc.moveDown();
      doc.strokeColor('#ddd').lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.left, doc.y).stroke();
      doc.moveDown();

      // Add a line below the address
      doc.moveDown();
      
      // Center "Product Details:" and add table right-aligned
      const tableTop = doc.y;
      doc.fontSize(12).text('Product Details:', { align: 'center', underline: true  });
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();


      // Add a line below "Product Details:"
    

      // Define table columns
      const columnWidths = [200, 60, 100, 100]; // Adjust column widths as needed
      const tableLeft = doc.page.margins.left // Align table to the right

      // Add table headers
      let x = tableLeft;
      let y = tableTop + 20; // Adjust y position if needed
      doc.fontSize(10);
      doc.text('Product Name', x, y, { width: columnWidths[0], align: 'left' });
      doc.text('Quantity', x + columnWidths[0], y, { width: columnWidths[1], align: 'left' });
      doc.text('Total Price', x + columnWidths[0] + columnWidths[1], y, { width: columnWidths[2], align: 'left' });
      doc.text('Offer Price', x + columnWidths[0] + columnWidths[1] + columnWidths[2], y, { width: columnWidths[3], align: 'left' });

      // Add a line below the table header
      y += 20; // Adjust y position if needed
      doc.strokeColor('#ddd').lineWidth(1).moveTo(tableLeft, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
      doc.moveDown();

      // Add table rows
      productDetails.forEach(product => {
          doc.text(product.productName, x, y + 10, { width: columnWidths[0], align: 'left' });
          doc.text(product.quantity, x + columnWidths[0], y + 10, { width: columnWidths[1], align: 'left' });
          doc.text(`₹${product.itemTotalPrice}`, x + columnWidths[0] + columnWidths[1], y + 10, { width: columnWidths[2], align: 'left' });
          doc.text(`₹${product.offerPrice}`, x + columnWidths[0] + columnWidths[1] + columnWidths[2], y + 10, { width: columnWidths[3], align: 'left' });
          y += 20; // Adjust row height if needed
      });

      // Add a line below the products table
      y += 20;
      doc.strokeColor('#ddd').lineWidth(1).moveTo(tableLeft, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
      doc.moveDown();
      doc.moveDown();
      doc.moveDown();

      // Add charges table
      doc.fontSize(12).text('Charges:', { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(`Delivery Charge: ₹${deliveryCharge}`, { align: 'left' });
      doc.text(`Packing Charge: ₹${packingCharge}`, { align: 'left' });
      doc.moveDown();
      
      // Add a line after charges
      doc.moveDown();
      doc.strokeColor('#ddd').lineWidth(1).moveTo(tableLeft, doc.y).lineTo(doc.page.width - doc.page.margins.left, doc.y).stroke();
      doc.moveDown();

      // Add total amount
      doc.fontSize(12).text(`Total Amount to be Paid: ₹${totalAmount}`, { align: 'left' });

      // End the PDF document
      doc.end();

  } catch (error) {
      console.error('Error generating invoice:', error);
      res.status(500).send('Error generating invoice');
  }
};
