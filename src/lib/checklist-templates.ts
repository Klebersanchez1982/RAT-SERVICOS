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
      "1 SISTEMA HIDRAULICO - LIMPEZA DO RESERVATORIO",
      "1 SISTEMA HIDRAULICO - VERIFICACAO DE TODOS OS ACOPLAMENTOS DA BOMBA",
      "1 SISTEMA HIDRAULICO - TROCA DE OLEO",
      "1 SISTEMA HIDRAULICO - VERIFICACAO/LIMPEZA EXTERNA DAS VALVULAS HIDRAULICAS",
      "1 SISTEMA HIDRAULICO - VERIFICACAO NO CILINDRO HIDRAULICO DA PLACA",
      "1 SISTEMA HIDRAULICO - VERIFICACAO DOS MANOMETROS",
      "2 LUBRIFICACAO - TROCA DE DOSADORES",
      "2 LUBRIFICACAO - TROCA DE FILTROS DE LINHA",
      "2 LUBRIFICACAO - TROCA DE FILTRO LUBE",
      "2 LUBRIFICACAO - REVISAO DE TODAS AS MANGUEIRAS",
      "3 SISTEMA PNEUMATICO - REVISAO DA UNIDADE DE CONSERVACAO",
      "3 SISTEMA PNEUMATICO - TROCA DE SILENCIADORES",
      "3 SISTEMA PNEUMATICO - TROCA/REVISAO DOS PRESSOSTATOS",
      "3 SISTEMA PNEUMATICO - TROCA DE OLEO PNEUMATICO",
      "3 SISTEMA PNEUMATICO - VERIFICACAO DOS MANOMETROS",
      "4 PAINEIS ELETRICOS - LIMPEZA DO PAINEL ELETRICO",
      "4 PAINEIS ELETRICOS - TROCA DE FILTROS",
      "4 PAINEIS ELETRICOS - REVISAO OU TROCA DE COOLERS DAS PORTAS",
      "4 PAINEIS ELETRICOS - VERIFICAR FUNCIONAMENTO DA CHAVE GERAL",
      "4 PAINEIS ELETRICOS - LIMPEZA E REVISAO NO CLIMATIZADOR DO PAINEL ELETRICO",
      "5 FUSOS E GUIAS - ANALISE DOS FUSOS ESFERICOS (FOLGAS) SE NECESSARIO REPARO EM LABORATORIO",
      "5 FUSOS E GUIAS - VERIFICACAO/LIMPEZA DOS ACOPLAMENTOS E POLIAS",
      "5 FUSOS E GUIAS - TROCAR CORREIAS DO EIXO X, Z CASO NECESSARIO",
      "5 FUSOS E GUIAS - REVISAO COMPLETA PARA ELIMINACAO DE FOLGAS PARA MELHOR DESEMPENHO",
      "6 SERVO MOTORES - MEDICAO DA ISOLACAO DOS SERVOS MOTORES",
      "6 SERVO MOTORES - TROCA/REVISAO DE CABOS DE POTENCIA E ENCODER (SE NECESSARIO)",
      "6 SERVO MOTORES - TROCA DOS MICROS DE REFERENCIA (SE NECESSARIO)",
      "6 SERVO MOTORES - REVISAO DO MOTOR DO VENTILADOR DO EIXO ARVORE",
      "7 BARRAMENTO DOS EIXOS - TROCA DOS RASPADORES X E Z",
      "7 BARRAMENTO DOS EIXOS - VERIFICACAO DE FOLGA/DESGASTE/LUBRIFICACAO TORCITE",
      "8 EIXO ARVORE - ANALISE DE RUIDO COMPLETA",
      "8 EIXO ARVORE - VERIFICACAO DE VAZAMENTO DO CILINDRO E CASO NECESSITE, TROCA DE REPAROS",
      "8 EIXO ARVORE - VERIFICACAO DE FOLGA",
      "8 EIXO ARVORE - TROCA DA CORREIA DO MOTOR SE NECESSARIO",
      "8 EIXO ARVORE - TROCA DA CORREIA DO ENCODER DIRETO SE NECESSARIO",
      "10 CONTRA PONTO - VERIFICACAO DE FUNCIONAMENTO",
      "10 CONTRA PONTO - VERIFICACAO /CORRECAO DE FOLGA",
      "11 SISTEMA DE REFRIGERACAO - TROCA DO FILTRO DE REFRIGERACAO",
      "11 SISTEMA DE REFRIGERACAO - ANALISE DE UNIAO ROTATIVA",
      "11 SISTEMA DE REFRIGERACAO - ANALISE DE MANGUEIRAS",
      "12 TRANSPORTADOR DE CAVACOS - REVISAO DO MOTOREDUTOR, VERIFICACAO DO NIVEL DE OLEO",
      "12 TRANSPORTADOR DE CAVACOS - INSPECIONAR VAZAMENTO NO RESERVATORIO DO TRANSPORTADOR",
      "12 TRANSPORTADOR DE CAVACOS - MONTAGEM E AJUSTE DE TENSIONAMENTO DA ESTEIRA E DO MICRO EMERGENCIA",
      "13 PROTECOES TELESCOPICAS DOS EIXOS - REVISAR PROTECOES TELESCOPICAS, CASO NECESSITE \"ENVIAR PARA TERCEIROS\"",
      "14 PAINEL OPERADOR - REVISAR IHM (PAINEL DE COMANDO, VIDEO E TECLADO);",
      "14 PAINEL OPERADOR - SUBSTITUIR COOLERS DO CNC, CASO NECESSARIO",
      "14 PAINEL OPERADOR - TROCA DE BOTOES DANIFICADOS;",
      "14 PAINEL OPERADOR - TROCA DE CHAVES",
      "14 PAINEL OPERADOR - VERIFICAR FUNCIONAMENTO HANDWELL",
      "14 PAINEL OPERADOR - LIMPEZA DA LUMINARIA INTERNA",
      "15 ACIONAMENTOS, INVERSORES E CNC - VERIFICAR RUIDO E LIMPEZA CASO NECESSITE ENVIAR PARA LABORATORIO",
      "15 ACIONAMENTOS, INVERSORES E CNC - VERIFICAR BATERIAS",
      "15 ACIONAMENTOS, INVERSORES E CNC - VERIFICAR SUJEIRA NOS COOLERS",
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
      "ITEM 1.1 - RETILINEIDADE DAS GUIAS DO BARRAMENTO",
      "ITEM 1.2 - IMPRECISAO TOTAL DE GIRO DE CENTRAGEM (AXIAL)",
      "ITEM 1.3 - IMPRECISAO TOTAL DE GIRO DO CONE INTERNO",
      "ITEM 1.4 - ORTOGONALIDADE ENTRE A SUPERFICIE DA MESA E O MOVIMENTO DO EIXO Z",
      "ITEM 1.5 - ORTOGONALIDADE ENTRE O MOVIMENTO DOS EIXOS X E Y",
      "ITEM 1.6 - RETILINEIDADE ENTRE A SUPERFICIE DA MESA E O MOVIMENTO DO EIXO Y",
      "ITEM 1.7 - RETILINEIDADE ENTRE A SUPERFICIE DA MESA E O MOVIMENTO DO EIXO X",
      "ITEM 1.8 - PARALELISMO ENTRE A RANHURA DE REFERENCIA E O MOVIMENTO DO EIXO X",
      "ITEM 1.9 - PERPENDICULARIDADE ENTRE A SUPERFICIE DA MESA E O EIXO ARVORE",
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

function removeGroupNumberPrefix(label: string): string {
  // Remove prefixo como "1 ", "2 ", "15 " do início do label
  return label.replace(/^\d+\s+/, "").trim();
}

export function getChecklistTemplateSections(templateKey: ChecklistTemplateKey): ChecklistTemplateSection[] {
  const items = checklistTemplateDefinitions[templateKey].itens;

  if (templateKey !== "checklist_cu" && templateKey !== "checklist_preventiva") {
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
    const groupLabelWithoutNumber = removeGroupNumberPrefix(groupLabelRaw || itemLabel);
    const subgroupLabel = (subgroupLabelRaw || itemLabel).trim();
    const sectionItems = groupedSections.get(groupLabelWithoutNumber) || [];

    sectionItems.push({
      itemId: `${templateKey}:${index + 1}`,
      itemLabel,
      subgroupLabel,
    });

    groupedSections.set(groupLabelWithoutNumber, sectionItems);
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

  if (templateKey === "checklist_preventiva") {
    return Boolean(answer.statusLivre?.trim());
  }

  if (templateKey === "inspecao_geometria") {
    return Boolean(answer.valorEncontrado?.trim() && answer.valorAtual?.trim());
  }

  if (templateKey === "instrucao_geometrica") {
    return Boolean(answer.valorEncontrado?.trim());
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
