import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

function templateClinica(dados: {
  nomePet: string;
  tipoExame: string;
  dataExame: string;
  laudoUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1C1C1E;">
      <div style="background-color: #8B1A1A; padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">IMAPET</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Diagnóstico Veterinário por Imagem</p>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
        <p style="color: #6B6B6B; font-size: 14px; margin-top: 0;">Segue o laudo do exame solicitado:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px; background: #F5F0EC; font-size: 13px; color: #6B6B6B; border-radius: 6px 0 0 0;">Paciente</td><td style="padding: 10px; font-size: 14px; font-weight: bold;">${dados.nomePet}</td></tr>
          <tr><td style="padding: 10px; background: #F5F0EC; font-size: 13px; color: #6B6B6B;">Exame</td><td style="padding: 10px; font-size: 14px;">${dados.tipoExame}</td></tr>
          <tr><td style="padding: 10px; background: #F5F0EC; font-size: 13px; color: #6B6B6B; border-radius: 0 0 0 6px;">Data</td><td style="padding: 10px; font-size: 14px;">${dados.dataExame}</td></tr>
        </table>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${dados.laudoUrl}" style="background-color: #8B1A1A; color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 15px;">
            📄 Acessar laudo
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #aaa; text-align: center; margin: 0;">
          IMAPET · Recife e região metropolitana · (81) 99674-1525
        </p>
      </div>
    </div>
  `;
}

function templateCliente(dados: {
  nomeTutor: string;
  nomePet: string;
  tipoExame: string;
  dataExame: string;
  laudoUrl: string;
  isNovoTutor: boolean;
  cpf?: string;
  senha?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1C1C1E;">
      <div style="background-color: #8B1A1A; padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">IMAPET</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Diagnóstico Veterinário por Imagem</p>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
        <p style="font-size: 15px;">Olá, <strong>${dados.nomeTutor}</strong>!</p>
        <p style="color: #6B6B6B; font-size: 14px;">O laudo do exame de <strong>${dados.nomePet}</strong> já está disponível:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px; background: #F5F0EC; font-size: 13px; color: #6B6B6B; border-radius: 6px 0 0 0;">Paciente</td><td style="padding: 10px; font-size: 14px; font-weight: bold;">${dados.nomePet}</td></tr>
          <tr><td style="padding: 10px; background: #F5F0EC; font-size: 13px; color: #6B6B6B;">Exame</td><td style="padding: 10px; font-size: 14px;">${dados.tipoExame}</td></tr>
          <tr><td style="padding: 10px; background: #F5F0EC; font-size: 13px; color: #6B6B6B; border-radius: 0 0 0 6px;">Data</td><td style="padding: 10px; font-size: 14px;">${dados.dataExame}</td></tr>
        </table>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${dados.laudoUrl}" style="background-color: #8B1A1A; color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 15px;">
            📄 Baixar meu laudo
          </a>
        </div>
        ${dados.isNovoTutor ? `
        <div style="background: #F5F0EC; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <p style="font-size: 13px; color: #6B6B6B; margin: 0 0 12px;">Acesse sua área do cliente em <strong>imapet.vercel.app/login</strong> para ver todo o histórico do seu pet:</p>
          <p style="font-size: 14px; margin: 4px 0;"><strong>CPF:</strong> ${dados.cpf}</p>
          <p style="font-size: 14px; margin: 4px 0;"><strong>Senha:</strong> ${dados.senha}</p>
        </div>
        ` : ""}
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #aaa; text-align: center; margin: 0;">
          IMAPET · Recife e região metropolitana · (81) 99674-1525
        </p>
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, para, dados } = body;

    const html = tipo === "clinica"
      ? templateClinica(dados)
      : templateCliente(dados);

    const assunto = tipo === "clinica"
      ? `Laudo de ${dados.tipoExame} — ${dados.nomePet}`
      : `Laudo do seu pet ${dados.nomePet} — IMAPET`;

    const { error } = await resend.emails.send({
      from: "IMAPET <laudos@imapet.com.br>",
      to: para,
      subject: assunto,
      html,
    });

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, erro: String(err) }, { status: 500 });
  }
}
