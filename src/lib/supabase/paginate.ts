import "server-only";

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/**
 * PostgREST plafonne le nombre de lignes qu'une requête renvoie (1000 par défaut sur un
 * projet hébergé). Lu d'un seul coup, l'historique d'une boutique active s'arrêterait
 * donc en silence au millième, et la suppression de compte effacerait des ventes qu'elle
 * croyait avoir archivées. On lit par pages jusqu'à la dernière.
 *
 * L'appelant doit trier la requête : sans `order`, deux pages peuvent se recouvrir.
 */
export async function selectAll<T>(page: (from: number, to: number) => Page<T>, size = 1000): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) return { data: all, error };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < size) return { data: all, error: null };
  }
}
