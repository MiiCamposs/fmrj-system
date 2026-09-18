import { describe, it, expect } from 'vitest';
import { parseSquadList } from './squad-import';

describe('parseSquadList', () => {
  it('separa a lista do clube (emojis, pipes e id sem pipe)', () => {
    const raw = `LISTA ENVIADA PELO CLUBE
1️⃣ Sar | #9fslg8 |
2️⃣ V | #n69mjf  |
3️⃣ Sw4 | #9mvr7g |
4️⃣ I am Insane | #61u4p1 |
5️⃣ cheng | #bfn1hn |
6️⃣ Divehi | #subpdp |
7️⃣ putodiparis | #mapyda |
8️⃣ trovsk | #1j511l |
9️⃣ Teaga7 #cmdvp8`;

    const { entries, invalid } = parseSquadList(raw);

    expect(entries).toHaveLength(9);
    expect(entries[0]).toMatchObject({ name: 'Sar', mamoballId: '9fslg8' });
    expect(entries[1]).toMatchObject({ name: 'V', mamoballId: 'n69mjf' });
    expect(entries[3]).toMatchObject({ name: 'I am Insane', mamoballId: '61u4p1' });
    expect(entries[8]).toMatchObject({ name: 'Teaga7', mamoballId: 'cmdvp8' });
    // "LISTA ENVIADA PELO CLUBE" nao tem '#': entra em invalid.
    expect(invalid).toContain('LISTA ENVIADA PELO CLUBE');
  });

  it('ignora ids duplicados', () => {
    const { entries } = parseSquadList('Sar #abc\nOutro #abc');
    expect(entries).toHaveLength(1);
  });

  it('aceita nome sem marcador e id colado', () => {
    const { entries } = parseSquadList('cheng #bfn1hn');
    expect(entries[0]).toMatchObject({ name: 'cheng', mamoballId: 'bfn1hn' });
  });
});
