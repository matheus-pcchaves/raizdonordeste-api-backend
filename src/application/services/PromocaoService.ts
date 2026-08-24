import { ICampanhaRepository } from '../../domain/repositories/ICampanhaRepository';

export interface ItemParaDesconto {
  produtoId: string;
  precoUnitario: number;
  quantidade: number;
}

export interface ItemComDesconto extends ItemParaDesconto {
  descontoAplicado: number;
  origemDesconto: string | null;
}

/**
 * Aplica campanhas ativas aos itens do pedido.
 * Regra: apenas um desconto por item — a maior vantagem ao cliente prevalece.
 */
export class PromocaoService {
  constructor(private readonly campanhaRepository: ICampanhaRepository) {}

  async aplicarDescontos(
    itens: ItemParaDesconto[],
    unidadeId: string,
  ): Promise<ItemComDesconto[]> {
    const campanhasAtivas = await this.campanhaRepository.listarAtivas(unidadeId);

    return itens.map((item) => {
      let melhorDesconto = 0;
      let origemDesconto: string | null = null;

      for (const campanha of campanhasAtivas) {
        if (campanha.estaAtiva() && campanha.aplicaAoProduto(item.produtoId)) {
          const desconto = campanha.calcularDesconto(item.precoUnitario);
          if (desconto > melhorDesconto) {
            melhorDesconto = desconto;
            origemDesconto = `CAMPANHA:${campanha.id}:${campanha.nome}`;
          }
        }
      }

      return {
        ...item,
        descontoAplicado: melhorDesconto,
        origemDesconto,
      };
    });
  }
}
