import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const assinatura = `
  <table cellpadding="0" cellspacing="0" style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
    <tr>
      <td style="padding-right: 16px; vertical-align: middle;">
        <img src="https://imapet.vercel.app/Logomarca/57423_Imapet_040521_aa-01.png" width="140" alt="IMAPET" style="display: block; width: 140px; height: auto; background: #ffffff;" />
      </td>
      <td style="border-left: 3px solid #8B1A1A; padding-left: 16px; vertical-align: middle;">
        <p style="margin: 0 0 2px; font-size: 15px; font-weight: bold; color: #1C1C1E;">Júliet Bertino</p>
        <p style="margin: 0 0 8px; font-size: 13px; color: #8B1A1A;">Médica Veterinária</p>
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: bold; color: #6B6B6B; letter-spacing: 0.05em; text-transform: uppercase;">IMAPET DIAGNÓSTICO VETERINÁRIO POR IMAGEM</p>
        <p style="margin: 2px 0; font-size: 12px; color: #6B6B6B;">m: <a href="tel:5581996741525" style="color: #6B6B6B; text-decoration: none;">(81) 99674-1525</a></p>
        <p style="margin: 2px 0; font-size: 12px; color: #6B6B6B;">w: <a href="https://imapet.com.br" style="color: #6B6B6B; text-decoration: none;">www.imapet.com.br</a></p>
        <p style="margin: 2px 0; font-size: 12px; color: #6B6B6B;">e: <a href="mailto:imapet@imapet.com.br" style="color: #6B6B6B; text-decoration: none;">imapet@imapet.com.br</a></p>
        <p style="margin: 2px 0; font-size: 12px; color: #6B6B6B;">i: <a href="https://instagram.com/imapet_diagvet" style="color: #8B1A1A; text-decoration: none;">instagram.com/imapet_diagvet</a></p>
      </td>
    </tr>
  </table>
`;

function template(saudacao: string, nomePet: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1C1C1E; font-size: 14px; line-height: 1.6;">
      <p>Olá, ${saudacao}!</p>
      <p>Segue em anexo o laudo do paciente <strong>${nomePet}</strong>.</p>
      <p>Qualquer dúvida, estamos à disposição.</p>
      ${assinatura}
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, para, dados } = body;
    const { nomePet, laudoUrl, nomeTutor, nomeClinica } = dados;

    const saudacao = tipo === "clinica" ? (nomeClinica || "prezados") : (nomeTutor || "prezado(a)");

    // Busca o PDF e anexa ao email
    let attachments: { filename: string; content: Buffer }[] = [];
    if (laudoUrl) {
      const response = await fetch(laudoUrl);
      const buffer = await response.arrayBuffer();
      attachments = [{
        filename: `Laudo_${nomePet.replace(/\s+/g, "_")}.pdf`,
        content: Buffer.from(buffer),
      }];
    }

    const { error } = await resend.emails.send({
      from: "Júliet Bertino <imapet@imapet.com.br>",
      to: para,
      subject: `Laudo — ${nomePet} | IMAPET`,
      html: template(saudacao, nomePet),
      attachments,
    });

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, erro: String(err) }, { status: 500 });
  }
}
