import { DiscordContextProvider } from "../hooks/useDiscordSdk.js";
import { Activity } from "./Activity.js";
import "./App.css";
/**
 * Set `authenticate` to true to enable Discord authentication.
 * You can also set the `scope` prop to request additional permissions.
 *
 * ```
 * <DiscordContextProvider authenticate scope={['identify', 'guilds']}>
 *  <Activity />
 * </DiscordContextProvider>
 * ```
 *
 * Learn more:
 * https://robojs.dev/discord-activities/authentication
 */ export default function App() {
    return /*#__PURE__*/ React.createElement(DiscordContextProvider, null, /*#__PURE__*/ React.createElement(Activity, null));
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkQ6XFxkaXNjXFxhbnRvbmJhbGxcXHNyY1xcYXBwXFxBcHAudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERpc2NvcmRDb250ZXh0UHJvdmlkZXIgfSBmcm9tICcuLi9ob29rcy91c2VEaXNjb3JkU2RrJ1xuaW1wb3J0IHsgQWN0aXZpdHkgfSBmcm9tICcuL0FjdGl2aXR5J1xuaW1wb3J0ICcuL0FwcC5jc3MnXG5cbi8qKlxuICogU2V0IGBhdXRoZW50aWNhdGVgIHRvIHRydWUgdG8gZW5hYmxlIERpc2NvcmQgYXV0aGVudGljYXRpb24uXG4gKiBZb3UgY2FuIGFsc28gc2V0IHRoZSBgc2NvcGVgIHByb3AgdG8gcmVxdWVzdCBhZGRpdGlvbmFsIHBlcm1pc3Npb25zLlxuICpcbiAqIGBgYFxuICogPERpc2NvcmRDb250ZXh0UHJvdmlkZXIgYXV0aGVudGljYXRlIHNjb3BlPXtbJ2lkZW50aWZ5JywgJ2d1aWxkcyddfT5cbiAqICA8QWN0aXZpdHkgLz5cbiAqIDwvRGlzY29yZENvbnRleHRQcm92aWRlcj5cbiAqIGBgYFxuICpcbiAqIExlYXJuIG1vcmU6XG4gKiBodHRwczovL3JvYm9qcy5kZXYvZGlzY29yZC1hY3Rpdml0aWVzL2F1dGhlbnRpY2F0aW9uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCgpIHtcblx0cmV0dXJuIChcblx0XHQ8RGlzY29yZENvbnRleHRQcm92aWRlcj5cblx0XHRcdDxBY3Rpdml0eSAvPlxuXHRcdDwvRGlzY29yZENvbnRleHRQcm92aWRlcj5cblx0KVxufVxuIl0sIm5hbWVzIjpbIkRpc2NvcmRDb250ZXh0UHJvdmlkZXIiLCJBY3Rpdml0eSIsIkFwcCJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBU0Esc0JBQXNCLFFBQVEsNEJBQXdCO0FBQy9ELFNBQVNDLFFBQVEsUUFBUSxnQkFBWTtBQUNyQyxPQUFPLFlBQVc7QUFFbEI7Ozs7Ozs7Ozs7OztDQVlDLEdBQ0QsZUFBZSxTQUFTQztJQUN2QixxQkFDQyxvQkFBQ0YsNENBQ0Esb0JBQUNDO0FBR0oifQ==