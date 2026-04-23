import { ChecklistAnswer, ChecklistBinaryChoice, ChecklistTemplateKey } from "./types";

export type ChecklistTemplateSectionItem = {
  itemId: string;
  itemLabel: string;
  subgroupLabel: string;
};

export type ChecklistTemplateSection = {
  groupLabel: string;
  items: ChecklistTemplateSectionItem[];
};

export const checklistTemplateDefinitions: Record<ChecklistTemplateKey, { label: string; itens: string[] }> = {
  checklist_cu: {
    label: "CHECK LIST C.U",
    itens: [
      "LUBRIFICACAO - BOMBA LUBE",
      "LUBRIFICACAO - DOSADORES",
      "LUBRIFICACAO - MANGUEIRAS",
      "LUBRIFICACAO - FILTRO LINHA",
      "SISTEMA PNEUMATICO - SISTEMA DE CONSERVACAO",
      "SISTEMA PNEUMATICO - FILTROS E LUBRIFICADORES",
      "SISTEMA PNEUMATICO - MANOMETROS",
      "SISTEMA PNEUMATICO - MANGUEIRAS",
      "SISTEMA PNEUMATICO - CONEXOES",
      "REFRIGERACAO - FILTROS",
      "REFRIGERACAO - SKIMMER",
      "REFRIGERACAO - ISOLACAO/CORRENTE MOTORES",
      "REFRIGERACAO - CORRENTE DISJUNTOR MOTOR",
      "REFRIGERACAO - MANGUEIRAS",
      "REFRIGERACAO - VALVULAS",
      "REFRIGERACAO - PRESSAO",
      "FUSOS - VERIFICAR FOLGAS",
      "FUSOS - ACOPLAMENTOS",
      "FUSOS - CORREIAS",
      "FUSOS - LIMPEZA",
      "GUIAS LINEARES - VERIFICAR GUIAS",
      "GUIAS LINEARES - VERIFICAR SAPATAS",
      "GUIAS LINEARES - LIMPEZA",
      "GUIAS LINEARES - LUBRIFICACAO",
      "BARRAMENTOS - VERIFICAR DESGASTES",
      "BARRAMENTOS - LIMPEZA",
      "BARRAMENTOS - RASPADORES",
      "BARRAMENTOS - REGUAS",
      "PROTECOES TELESCOPICAS - VERIFICAR RASPADORES",
      "PROTECOES TELESCOPICAS - LIMPEZA",
      "PROTECOES TELESCOPICAS - FIXACAO",
      "EIXO ARVORE - BALANCEAMENTO",
      "EIXO ARVORE - PRESSAO DE FIXACAO",
      "EIXO ARVORE - DRAWBAR/HIDROCHECK",
      "EIXO ARVORE - CORREIA",
      "EIXO ARVORE - VERIFICAR ALINHAMENTO",
      "EIXO ARVORE - VERIFICAR SUPORTES",
      "T.A.F - VERIFICAR ALTURA DE TROCA",
      "T.A.F - VERIFICAR SENSORES",
      "T.A.F - VERIFICAR APERTO DOS CONJUNTOS MECANICOS",
      "T.A.F - VERIFICAR MOTOR/REDUTOR/FREIO",
      "T.A.F - VERIFICAR CONJUNTO PNEUMATICO",
      "QUARTO EIXO - VERIFICAR FOLGA",
      "QUARTO EIXO - VERIFICAR CORREIA/POLIAS",
      "QUARTO EIXO - MANGUEIRAS E CONEXOES",
      "QUARTO EIXO - VERIFICAR TOMADAS/CABOS",
      "QUARTO EIXO - VERIFICAR SISTEMA DE FREIO",
      "QUARTO EIXO - VERIFICAR PRESSOSTATO",
      "TRANSPORTADOR DE CAVACO - VERIFICAR CORRENTE DO MOTOR",
      "TRANSPORTADOR DE CAVACO - VERIFICAR TOMADA/CABO",
      "TRANSPORTADOR DE CAVACO - TROCAR OLEO DO REDUTOR",
      "TRANSPORTADOR DE CAVACO - VERIFICAR ESTEIRA",
      "EXAUSTOR DE NEVOA - VERIFICAR FILTRO",
      "EXAUSTOR DE NEVOA - VERIFICAR CORRENTE DO MOTOR",
      "CHAPARIAS - VERIFICAR APERTO",
      "CHAPARIAS - LIMPEZA",
      "CHAPARIAS - ACRILICO DAS PORTAS",
      "ARMARIO ELETRICO - LIMPEZA",
      "ARMARIO ELETRICO - APERTO NAS CONEXOES",
      "ARMARIO ELETRICO - FILTRO DO ARMARIO ELETRICO",
      "ARMARIO ELETRICO - VENTILADOR/CLIMATIZADOR",
      "ARMARIO ELETRICO - CHAVE GERAL",
      "ARMARIO ELETRICO - ATERRAMENTO",
      "ARMARIO ELETRICO - ACIONAMENTOS",
      "SERVOMOTORES - EIXO X",
      "SERVOMOTORES - EIXO Y",
      "SERVOMOTORES - EIXO Z",
      "SERVOMOTORES - SPINDLE",
      "REFERENCIAMENTO - CHECAR MICROS/CABOS",
      "REFERENCIAMENTO - CHECAR BATERIAS",
      "REFERENCIAMENTO - CHECAR LIMITES DE SOFTWARE/HARDWARE",
      "PAINEL DO OPERADOR - LIMPEZA",
      "PAINEL DO OPERADOR - FUNCIONAMENTO DOS BOTOES/TECLAS",
      "PAINEL DO OPERADOR - FUNCIONAMENTO DOS LEDS",
      "SEGURANCA - CHECAR BOTOES DE EMERGENCIA",
      "SEGURANCA - CHECAR CHAVE DE SEGURANCA DAS PORTAS",
      "PARAMETROS - CHECAR PARAMETROS",
      "PARAMETROS - FAZER BACKUP COMPLETO",
    ],
  },
  checklist_preventiva: {
    label: "CHECK LIST PREVENTIVA PADRAO",
    itens: [
      "Inspecao visual da maquina",
      "Verificacao do sistema de lubrificacao",
      "Conferencia do aperto de conexoes eletricas",
      "Teste de funcionamento dos sensores",
      "Limpeza de filtros e trocadores",
      "Medicao de folgas e vibracao",
      "Backup de parametros de maquina",
      "Registro de recomendacoes preventivas",
    ],
  },
  inspecao_geometria: {
    label: "INSPECAO DE GEOMETRIA",
    itens: [
      "IMPRECISAO TOTAL DE GIRO\nDA SUPERFICIE EXTERNA\nDE CENTRAGEM\nDO NARIZ DO ARVORE",
      "IMPRECISAO TOTAL DE GIRO\nDA SUPERFICIE INTERNA\nDE CENTRAGEM DO NARIZ\nDO ARVORE.",
      "A) O MAIS PROXIMO\nPOSSIVEL DO NARIZ.",
      "B) A 300mm DO NARIZ",
      "PARALELISMO ENTRE O EIXO ARVORE E O MOVIMENTO LONGITUDINAL\nDO CARRO EM COMPRIMENTO DE 100mm",
      "PARALELISMO ENTRE O EIXO ARVORE E O MOVIMENTO LONGITUDINAL\nDO CARRO EM COMPRIMENTO DE 300mm",
      "ALINHAMENTO LATERAL ENTRE OS CENTROS DOS PONTOS DOS\nCABECOTES FIXO E MOVEL.",
      "ALINHAMENTO INTERNO DO CASTELO DA TORRE",
      "FOLGA DO FUSO EIXO X",
      "CORRECAO DE FOLGA EIXO X",
      "FOLGA DO FUSO EIXO Z",
      "CORRECAO DE FOLGA EIXO Z",
      "NIVELAMENTO DA MAQUINA",
    ],
  },
  instrucao_geometrica: {
    label: "Instrucao Geometrica Centro de Usinagem",
    itens: [
      "Preparacao de relogio comparador e base magnetica",
      "Sequencia de medicao eixo X",
      "Sequencia de medicao eixo Y",
      "Sequencia de medicao eixo Z",
      "Checagem de esquadro da mesa",
      "Ajuste de parametros de compensacao",
      "Validacao por peca teste",
      "Aprovacao tecnica e assinatura",
    ],
  },
};

const checklistBinaryChoices: ChecklistBinaryChoice[] = ["sim", "nao"];

export const checklistTemplates = (Object.keys(checklistTemplateDefinitions) as ChecklistTemplateKey[]).map((key) => ({
  key,
  label: checklistTemplateDefinitions[key].label,
}));

export function getChecklistBinaryChoices() {
  return checklistBinaryChoices;
}

export function getChecklistTemplateSections(templateKey: ChecklistTemplateKey): ChecklistTemplateSection[] {
  const items = checklistTemplateDefinitions[templateKey].itens;

  if (templateKey !== "checklist_cu") {
    return [
      {
        groupLabel: checklistTemplateDefinitions[templateKey].label,
        items: items.map((itemLabel, index) => ({
          itemId: `${templateKey}:${index + 1}`,
          itemLabel,
          subgroupLabel: itemLabel,
        })),
      },
    ];
  }

  const groupedSections = new Map<string, ChecklistTemplateSectionItem[]>();

  items.forEach((itemLabel, index) => {
    const [groupLabelRaw, subgroupLabelRaw] = itemLabel.split(" - ", 2);
    const groupLabel = (groupLabelRaw || itemLabel).trim();
    const subgroupLabel = (subgroupLabelRaw || itemLabel).trim();
    const sectionItems = groupedSections.get(groupLabel) || [];

    sectionItems.push({
      itemId: `${templateKey}:${index + 1}`,
      itemLabel,
      subgroupLabel,
    });

    groupedSections.set(groupLabel, sectionItems);
  });

  return Array.from(groupedSections.entries()).map(([groupLabel, sectionItems]) => ({
    groupLabel,
    items: sectionItems,
  }));
}

export function isChecklistAnswerComplete(templateKey: ChecklistTemplateKey, answer: ChecklistAnswer): boolean {
  if (templateKey === "checklist_cu") {
    return Boolean(answer.revisado && answer.trocado);
  }

  if (templateKey === "inspecao_geometria") {
    return Boolean(answer.valorEncontrado?.trim() && answer.valorAtual?.trim());
  }

  return answer.resultado !== "pendente";
}

export function getChecklistProgress(templateKey: ChecklistTemplateKey, answers: ChecklistAnswer[]) {
  return {
    completed: answers.filter((answer) => isChecklistAnswerComplete(templateKey, answer)).length,
    total: answers.length,
  };
}

export function getDefaultChecklistAnswers(templateKey: ChecklistTemplateKey): ChecklistAnswer[] {
  return checklistTemplateDefinitions[templateKey].itens.map((itemLabel, index) => ({
    itemId: `${templateKey}:${index + 1}`,
    itemLabel,
    resultado: "pendente",
    observacao: "",
  }));
}
