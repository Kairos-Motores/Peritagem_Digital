//import '@material/web/textfield/filled-text-field.js';
import { forwardRef } from 'react';

const MdTextField = forwardRef(({ label, error, ...props }, ref) => (
  <md-filled-text-field label={label} error={error} {...props} ref={ref}></md-filled-text-field>
));

export default MdTextField;