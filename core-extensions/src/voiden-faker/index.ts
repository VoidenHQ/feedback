import voidenFakerPlugin from './plugin';

export { VoidenFakerExtension } from './extension';
export { FakerSuggestion } from './lib/fakerSuggestion';
export { fakerAutocomplete } from './lib/fakerAutocomplete';
export { FAKER_FUNCTIONS, executeFakerFunction, replaceFakerVariables } from './lib/fakerEngine';

export default voidenFakerPlugin;
