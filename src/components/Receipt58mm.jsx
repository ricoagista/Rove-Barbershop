import React from 'react';
import { useApp } from '../context/AppContext';
import { rp, fmtPhone } from '../utils/format';

export default function Receipt58mm({ trx }) {
  const { brand, kontak, notaConfig } = useApp();
  const [promoReady, setPromoReady] = React.useState(!notaConfig.img);

  React.useEffect(() => {
    if (!notaConfig.img) return setPromoReady(true);
    const image = new Image();
    image.onload = () => setPromoReady(true);
    image.onerror = () => setPromoReady(false);
    image.src = notaConfig.img;
  }, [notaConfig.img]);
  if (!trx) return null;

  const tg = new Date(trx.ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isReservasi = trx.jenis === 'reservasi';
  const rawMsg = isReservasi
    ? notaConfig.msgReservasi ?? notaConfig.msgLama ?? 'Terima kasih sudah melakukan reservasi di Rove Barbershop.'
    : notaConfig.msgRegular ?? notaConfig.msgBaru ?? 'Sampaikan pengalaman baik Anda pada Kawan\nJika ada kurang puas info kami GARANASI 24 Jam';

  const Row = ({ left, right, big }) => (
    <table className={`nt ${big ? 'big' : ''}`}>
      <tbody>
        <tr>
          <td>{left}</td>
          <td className="rt">{right}</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div id="nota">
      <div className="nc">
        <img src="/logo.jpeg" alt="Logo" />
        <div>{brand.nama}</div>
        {brand.jargon && (
          <div>
            <b>{brand.jargon}</b>
          </div>
        )}
        {kontak.waShow && (
          <div>
            <b>Hotline {fmtPhone(kontak.waShow)}</b>
          </div>
        )}
        <div>Nota Pembayaran</div>
      </div>
      <hr />
      <Row left="No" right={trx.nomor || '-'} />
      <Row left="Tgl" right={tg} />
      <Row left="Kasir" right={trx.kasir_nama || trx.kasirNama || '-'} />
      {(trx.capster_nama || trx.capsterNama) && (
        <Row left="Capster" right={trx.capster_nama || trx.capsterNama} />
      )}
      <Row left="Pelanggan" right={trx.pelanggan || '-'} />
      {trx.wa && <Row left="WA" right={trx.wa} />}
      <hr />
      {(trx.items || []).map((item, idx) => (
        <React.Fragment key={idx}>
          <div>{item.nama}</div>
          <Row
            left={`${item.qty} x ${new Intl.NumberFormat('id-ID').format(item.harga)}`}
            right={new Intl.NumberFormat('id-ID').format(item.harga * item.qty)}
          />
        </React.Fragment>
      ))}
      <hr />
      {trx.diskon > 0 && (
        <>
          <Row left="Subtotal" right={rp(trx.subtotal)} />
          <Row left={`Promo ${trx.promo || ''}`} right={`-${rp(trx.diskon)}`} />
        </>
      )}
      <Row left="TOTAL" right={rp(trx.total)} big />
      <Row left="Bayar" right={trx.metode} />
      {trx.metode === 'Tunai' && (
        <>
          <Row left="Diterima" right={rp(trx.diterima)} />
          <Row left="Kembali" right={rp(trx.kembali)} />
        </>
      )}
      <hr />
      {rawMsg.trim() && (
        <>
          <div className="nc nb">
            {rawMsg.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < rawMsg.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
          <hr />
        </>
      )}
      {notaConfig.img && promoReady && (
        <>
          <img className="ni" src={notaConfig.img} alt="Promo Nota" onLoad={() => setPromoReady(true)} />
          <hr />
        </>
      )}
    </div>
  );
}