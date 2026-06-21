const urduLabels: Record<string, string> = {
  length: 'لمبائی',
  chest: 'چھاتی',
  waist: 'کمر',
  hips: 'ہپس',
  shoulder: 'تیرا',
  sleeve: 'بازو',
  collar: 'کالر',
  shalwarLength: 'شلوار',
  pancha: 'پانچہ',
};

export const getUrduLabel = (key: string) => urduLabels[key] || '';

export const generateCustomerHtml = (
  shopProfile: any,
  orderNumber: string | number,
  customerName: string,
  customerPhone: string,
  bookingDate: string,
  pickupDate: string,
  garmentType: string,
  measurements: Record<string, string>,
  style: any,
  notes: string,
  totalNum: number,
  advanceNum: number,
  balance: number
) => {
  return `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
          
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; padding: 20px; max-width: 800px; margin: 0 auto; border: 1px solid #ccc; }
          
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .shop-name-urdu { font-family: 'Noto Nastaliq Urdu', serif; font-size: 36px; font-weight: bold; margin: 0; line-height: 1.5; }
          .shop-name-eng { font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 5px 0; letter-spacing: 2px; }
          .shop-contact { font-size: 14px; margin: 5px 0; color: #333; }
          
          .invoice-title { text-align: center; font-size: 20px; font-weight: bold; margin: -10px auto 20px auto; background: #000; color: #fff; padding: 5px 15px; border-radius: 4px; display: inline-block; position: relative; top: -10px; border: 2px solid #fff; outline: 1px solid #000; }
          
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 15px; }
          .meta-col { width: 48%; }
          .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding: 6px 0; }
          .urdu-label { font-family: 'Noto Nastaliq Urdu', serif; font-size: 14px; }
          
          .measurements-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #000; }
          .measurements-table th, .measurements-table td { border: 1px solid #000; padding: 10px; text-align: center; }
          .measurements-table th { background: #f0f0f0; font-size: 14px; text-transform: uppercase; }
          .measure-val { font-size: 18px; font-weight: bold; }
          .measure-title { font-size: 12px; color: #555; text-transform: uppercase; }
          
          .style-box { border: 1px solid #000; padding: 15px; margin-bottom: 20px; font-size: 15px; }
          
          .finance-box { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; width: 60%; float: right; background: #fafafa; border-radius: 4px; }
          .finance-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 16px; }
          .finance-row.total { font-weight: bold; font-size: 18px; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 5px; }
          .finance-row.balance { font-size: 22px; font-weight: bold; color: #000; background: #e8e8e8; padding: 10px; border: 1px solid #ccc; margin-top: 10px; border-radius: 4px; }
          
          .footer-policy { clear: both; text-align: center; margin-top: 40px; padding-top: 10px; border-top: 1px solid #000; font-family: 'Noto Nastaliq Urdu', serif; font-size: 16px; line-height: 1.8; }
          .footer-policy-eng { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; margin-top: 5px; color: #555; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name-urdu">${shopProfile?.name || 'انچی ٹیلرز'}</h1>
          <h2 class="shop-name-eng">${shopProfile?.name || 'INCHI TAILORS'}</h2>
          ${shopProfile?.address ? `<p class="shop-contact">${shopProfile.address.replace(/\n/g, ', ')}</p>` : ''}
          ${shopProfile?.phone ? `<p class="shop-contact">Ph: ${shopProfile.phone}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 24px; font-weight: bold; background: #000; color: #fff; padding: 5px 15px; border-radius: 4px; display: inline-block;">Order No. #${orderNumber}</div>
        </div>

        <div style="border: 1px solid #ccc; margin-bottom: 20px; border-radius: 4px;">
          <div style="background: #f8f8f8; padding: 10px 15px; border-bottom: 1px solid #ccc; font-size: 20px; font-weight: bold; text-transform: uppercase;">
            <span style="color: #555; font-size: 14px; text-transform: none; font-weight: normal; margin-right: 5px;">Customer Name <span class="urdu-label">(نام)</span>:</span> ${customerName}
          </div>
          <div style="display: flex; flex-wrap: wrap; padding: 10px 15px; font-size: 15px;">
            <div style="width: 50%; margin-bottom: 8px;"><strong>Booking <span class="urdu-label" style="font-size: 14px; font-weight: normal;">(تاریخ)</span>:</strong> ${bookingDate}</div>
            <div style="width: 50%; margin-bottom: 8px;"><strong>Delivery <span class="urdu-label" style="font-size: 14px; font-weight: normal;">(واپسی)</span>:</strong> ${pickupDate}</div>
            <div style="width: 50%;"><strong>Garment <span class="urdu-label" style="font-size: 14px; font-weight: normal;">(سوٹ)</span>:</strong> ${garmentType || 'Kameez Shalwar'}</div>
            <div style="width: 50%;"><strong>Phone <span class="urdu-label" style="font-size: 14px; font-weight: normal;">(فون)</span>:</strong> ${customerPhone || '-'}</div>
          </div>
        </div>
        
        <table class="measurements-table">
          <tr>
            <th colspan="3" style="font-size: 16px;">Measurements <span class="urdu-label" style="font-size: 18px; margin-left: 10px;">(ناپ)</span></th>
          </tr>
          ${Object.entries(measurements || {}).reduce((acc: any[], [key, val], index) => {
    if (index % 3 === 0) acc.push([]);
    acc[acc.length - 1].push({ key, val });
    return acc;
  }, []).map((row: any[]) => `
              <tr>
                ${row.map(item => `
                  <td>
                    <div class="measure-title">${item.key} <span class="urdu-label">(${getUrduLabel(item.key)})</span></div>
                    <div class="measure-val">${item.val}</div>
                  </td>
                `).join('')}
                ${Array(3 - row.length).fill('<td></td>').join('')}
              </tr>
            `).join('')}
        </table>
        
        <div class="style-box">
          <strong>Collar <span class="urdu-label">(کالر)</span>:</strong> ${style?.collar || 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; 
          <strong>Pockets <span class="urdu-label">(جیب)</span>:</strong> ${(style?.pockets || []).join(', ') || 'N/A'}
          ${notes ? `<br/><br/><strong>Notes <span class="urdu-label">(ہدایات)</span>:</strong> ${notes}` : ''}
        </div>
        
        <div class="finance-box">
          <div class="finance-row"><span>Subtotal <span class="urdu-label">(کل رقم)</span></span> <span>Rs. ${totalNum}</span></div>
          <div class="finance-row"><span>Advance Paid <span class="urdu-label">(پیشگی)</span></span> <span>Rs. ${advanceNum}</span></div>
          <div class="finance-row balance"><span>Balance Due <span class="urdu-label">(بقایا)</span></span> <span>Rs. ${balance}</span></div>
        </div>
        
        <div class="footer-policy">
          کپڑے وصول کرتے وقت رسید ہمراہ لائیں۔ بغیر رسید کپڑے نہیں ملیں گے۔<br/>
          سلائی کی شکایت 7 دن کے اندر دور کی جائے گی۔
          <div class="footer-policy-eng">Please bring this slip at the time of pickup. Any stitching complaints must be reported within 7 days.</div>
        </div>
      </body>
    </html>
  `;
};
