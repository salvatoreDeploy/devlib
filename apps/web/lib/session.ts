export type Session = {
  id: string;
  email: string;
};

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return atob(padded);
}

/**
 * Não há endpoint /me na API — o payload do access token (sub/email) já
 * carrega o necessário pro header exibir o usuário logado. Leitura local,
 * sem verificação de assinatura (só exibição, nunca usado pra autorizar).
 */
export function decodeAccessToken(accessToken: string): Session | null {
  try {
    const payloadSegment = accessToken.split(".")[1];
    if (!payloadSegment) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(payloadSegment));
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
