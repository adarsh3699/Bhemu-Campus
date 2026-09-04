import { registerWebModule, NativeModule } from 'expo';

// BhemuUpdaterModule is not available on the web platform.
class BhemuUpdaterModule extends NativeModule<{}> {}

export default registerWebModule(BhemuUpdaterModule, 'BhemuUpdaterModule');
