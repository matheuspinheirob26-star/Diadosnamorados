export const cn = (...classes: (string | undefined | null | boolean | { [key: string]: boolean })[]) => {
  const result: string[] = [];
  classes.forEach(c => {
    if (!c) return;
    if (typeof c === 'string') {
      result.push(c);
    } else if (typeof c === 'object') {
      Object.entries(c).forEach(([key, value]) => {
        if (value) result.push(key);
      });
    }
  });
  return result.join(' ');
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatCpf = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .substring(0, 14);
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 14);
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15);
};

export const formatCep = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
};

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  deliveryDays: number;
  provider: 'correios' | 'melhorenvio';
}

// Simulador de Frete Correios / Melhor Envio com base na faixa de CEP brasileira
export const simulateShipping = (cep: string): ShippingOption[] => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length < 8) return [];

  const firstDigit = parseInt(cleanCep[0]);
  let basePrice = 18.90;
  let baseDays = 4;

  // Ajustes por região baseados no primeiro dígito do CEP
  switch (firstDigit) {
    case 0: // Grande São Paulo / SP Capital
      basePrice = 9.90;
      baseDays = 1;
      break;
    case 1: // Interior de SP / Litoral SP
      basePrice = 14.90;
      baseDays = 2;
      break;
    case 2: // Rio de Janeiro / Espírito Santo
      basePrice = 17.90;
      baseDays = 3;
      break;
    case 3: // Minas Gerais
      basePrice = 19.90;
      baseDays = 3;
      break;
    case 4: // Bahia e Sergipe (Nordeste Sul)
      basePrice = 24.90;
      baseDays = 4;
      break;
    case 5: // Pernambuco, Alagoas, Paraíba, RN (Nordeste Norte)
      basePrice = 27.90;
      baseDays = 5;
      break;
    case 6: // Ceará, Piauí, Maranhão, Pará, Amapá (Norte/Nordeste)
      basePrice = 29.90;
      baseDays = 6;
      break;
    case 7: // Centro-Oeste / DF / TO
      basePrice = 22.90;
      baseDays = 4;
      break;
    case 8: // Paraná / Santa Catarina
      basePrice = 19.90;
      baseDays = 3;
      break;
    case 9: // Rio Grande do Sul
      basePrice = 21.90;
      baseDays = 4;
      break;
    default:
      basePrice = 22.90;
      baseDays = 5;
  }

  return [
    {
      id: 'sedex',
      name: 'SEDEX Expresso',
      price: basePrice + 12.00,
      deliveryDays: Math.max(1, baseDays - 1),
      provider: 'correios'
    },
    {
      id: 'pac',
      name: 'PAC Econômico',
      price: basePrice,
      deliveryDays: baseDays + 2,
      provider: 'correios'
    },
    {
      id: 'jadlog',
      name: 'Jadlog Express (Melhor Envio)',
      price: basePrice + 6.50,
      deliveryDays: Math.max(1, baseDays),
      provider: 'melhorenvio'
    }
  ];
};

// Validador simples de CPF
export const validateCpf = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;

  // Elimina CPFs conhecidos inválidos
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Validação dos dígitos verificadores
  let sum = 0;
  let rest;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.substring(10, 11))) return false;

  return true;
};
