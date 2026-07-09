//import '@material/web/top-app-bar/lib/top-app-bar.js';
import MdIcon from './MdIcon';

export default function MdTopAppBar({ title, navigationIcon, actions = [] }) {
  return (
    <md-top-app-bar>
      {navigationIcon && (
        <MdIcon slot="navigation" onClick={navigationIcon.onClick}>
          {navigationIcon.icon}
        </MdIcon>
      )}
      <h1 slot="title">{title}</h1>
      {actions.map((action, i) => (
        <MdIcon key={i} slot="action" onClick={action.onClick}>
          {action.icon}
        </MdIcon>
      ))}
    </md-top-app-bar>
  );
}