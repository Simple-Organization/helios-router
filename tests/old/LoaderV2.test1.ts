import { expect, test } from '@playwright/test';
import { waitMs } from '../utils/utils';
import { LoaderV2 } from '../../src/old/LoaderV2';
import { GetServiceFunction } from '../../src/old/types';

//
//

test.beforeEach(() => {
  test.skip(true, 'Usando o LoaderV4');
});

//
//

const getServiceNoop: GetServiceFunction = () => null as any;

//
//

test('Deve carregar o valor com sucesso', () => {
  const loader = new LoaderV2(getServiceNoop, () => 1);

  expect(loader.get()).toBe('initial');

  const value = loader.load();

  expect(loader.get()).toBe('success');
  expect(loader.data.get()).toBe(1);
  expect(value).toBe(1);
});

//
//

test('Deve dar erro caso tente acessar data ou error no stage initial', () => {
  const loader = new LoaderV2(getServiceNoop, () => 1);

  expect(() => loader.data.get()).toThrow('Cannot get value before set');
  expect(() => loader.error.get()).toThrow('Cannot get value before set');

  expect(loader.get()).toBe('initial');
});

//
//

test('Não deve pegar mudar para skeleton se não chamar o set', () => {
  const stages = [] as string[];
  const loader = new LoaderV2(getServiceNoop, () => 1);

  loader.subscribe((stage) => stages.push(stage));

  expect(loader.get()).toBe('initial');

  loader.load();

  expect(stages).toEqual(['initial', 'success']);
});

//
//

test('Deve mudar para skeleton se chamar o set com "loading"', () => {
  const stages = [] as string[];
  const loader = new LoaderV2(getServiceNoop, (set) => {
    set('loading');
    return 1;
  });

  loader.subscribe((stage) => stages.push(stage));

  expect(loader.get()).toBe('initial');

  loader.load();

  expect(stages).toEqual(['initial', 'skeleton', 'success']);
  expect(loader.get()).toBe('success');
  expect(loader.data.get()).toBe(1);
});

//
//

test('Deve definir como erro caso aconteça e deve dar error no load também', () => {
  const stages = [] as string[];
  const loader = new LoaderV2(getServiceNoop, () => {
    throw new Error('error');
  });

  loader.subscribe((stage) => stages.push(stage));

  // Deve dar erro no load()
  expect(() => loader.load()).toThrow();

  expect(stages).toEqual(['initial', 'error']);

  expect(loader.get()).toBe('error');

  expect(loader.error.get()).toBeInstanceOf(Error);

  // Deve dar erro ao tentar pegar o valor
  expect(() => loader.data.get()).toThrow();
});

//
//

test('O Loader deve funcionar de forma assíncrona corretamente', async () => {
  const stages = [] as string[];
  const loader = new LoaderV2(getServiceNoop, async (set) => {
    set('loading');
    await waitMs(50);
    return 1;
  });

  loader.subscribe((stage) => stages.push(stage));

  const value = await loader.load();

  expect(stages).toEqual(['initial', 'skeleton', 'success']);
  expect(() => loader.error.get()).toThrow();

  expect(loader.get()).toBe('success');
  expect(value).toBe(1);
  expect(loader.data.get()).toBe(1);
});

//
//

test('Deve definir como erro caso aconteça de forma assíncrona e deve dar error no load também', async () => {
  const stages = [] as string[];
  const loader = new LoaderV2(getServiceNoop, async (set) => {
    set('loading');
    await waitMs(50);
    throw new Error('error');
  });

  loader.subscribe((stage) => stages.push(stage));

  // Deve dar erro no load()
  await expect(() => loader.load()).rejects.toThrow();

  expect(stages).toEqual(['initial', 'skeleton', 'error']);

  expect(loader.get()).toBe('error');

  expect(loader.error.get()).toBeInstanceOf(Error);

  // Deve dar erro ao tentar pegar o valor
  expect(() => loader.data.get()).toThrow();
});

//
//

test('Não deve mudar para skeleton se estiver no success', () => {
  const stages = [] as string[];
  let a = 0;
  const loader = new LoaderV2(getServiceNoop, (set) => {
    set('loading');
    return ++a;
  });

  loader.subscribe((stage) => stages.push(stage));

  loader.load();

  expect(stages).toEqual(['initial', 'skeleton', 'success']);
  expect(loader.get()).toBe('success');
  expect(loader.data.get()).toBe(1);
  expect(a).toBe(1);

  loader.load();

  // Não deve mudar de novo
  expect(stages).toEqual(['initial', 'skeleton', 'success']);
  expect(loader.get()).toBe('success');
  expect(loader.data.get()).toBe(2);
  expect(a).toBe(2);
});

//
//

test('Deve mudar para skeleton se der erro', () => {
  const stages = [] as string[];
  let a = 0;
  let error = true;

  const loader = new LoaderV2(getServiceNoop, (set) => {
    set('loading');
    if (error) {
      throw new Error('error');
    }
    return ++a;
  });

  loader.subscribe((stage) => stages.push(stage));

  expect(() => loader.load()).toThrow();

  expect(stages).toEqual(['initial', 'skeleton', 'error']);
  expect(loader.get()).toBe('error');
  expect(a).toBe(0);

  error = false;
  loader.load();

  // Deve mudar para skeleton por conta do erro
  expect(stages).toEqual([
    'initial',
    'skeleton',
    'error',
    'skeleton',
    'success',
  ]);
  expect(loader.get()).toBe('success');
  expect(loader.data.get()).toBe(1);
  expect(a).toBe(1);
});

//
//

test('loader.loading deve mudar sempre que estiver fazendo load', () => {
  const stages = [] as string[];
  const loadings = [] as boolean[];

  let a = 0;
  let error = false;
  const loader = new LoaderV2(getServiceNoop, (set) => {
    set('loading');
    if (error) {
      throw new Error('error');
    }
    return ++a;
  });

  loader.loading.subscribe((loading) => loadings.push(loading));
  loader.subscribe((stage) => stages.push(stage));

  loader.load();

  expect(stages).toEqual(['initial', 'skeleton', 'success']);
  expect(loadings).toEqual([false, true, false]);

  loader.load();

  // Não deve mudar o skeleton de novo
  expect(stages).toEqual(['initial', 'skeleton', 'success']);
  expect(loadings).toEqual([false, true, false, true, false]);

  error = true;
  expect(() => loader.load()).toThrow();

  // Deve mudar para erro, mas manter o loading como true
  expect(stages).toEqual(['initial', 'skeleton', 'success', 'error']);
  expect(loadings).toEqual([false, true, false, true, false, true, false]);
});
