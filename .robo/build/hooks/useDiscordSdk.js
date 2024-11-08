import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";
import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
const queryParams = new URLSearchParams(window.location.search);
const isEmbedded = queryParams.get('frame_id') != null;
let discordSdk;
if (isEmbedded) {
    discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
} else {
    // We're using session storage for user_id, guild_id, and channel_id
    // This way the user/guild/channel will be maintained until the tab is closed, even if you refresh
    // Session storage will generate new unique mocks for each tab you open
    // Any of these values can be overridden via query parameters
    // i.e. if you set https://my-tunnel-url.com/?user_id=test_user_id
    // this will override this will override the session user_id value
    const mockUserId = getOverrideOrRandomSessionValue('user_id');
    const mockGuildId = getOverrideOrRandomSessionValue('guild_id');
    const mockChannelId = getOverrideOrRandomSessionValue('channel_id');
    discordSdk = new DiscordSDKMock(import.meta.env.VITE_DISCORD_CLIENT_ID, mockGuildId, mockChannelId);
    const discriminator = String(mockUserId.charCodeAt(0) % 5);
    discordSdk._updateCommandMocks({
        authenticate: async ()=>{
            return {
                access_token: 'mock_token',
                user: {
                    username: mockUserId,
                    discriminator,
                    id: mockUserId,
                    avatar: null,
                    public_flags: 1
                },
                scopes: [],
                expires: new Date(2112, 1, 1).toString(),
                application: {
                    description: 'mock_app_description',
                    icon: 'mock_app_icon',
                    id: 'mock_app_id',
                    name: 'mock_app_name'
                }
            };
        }
    });
}
export { discordSdk };
var SessionStorageQueryParam = /*#__PURE__*/ function(SessionStorageQueryParam) {
    SessionStorageQueryParam["user_id"] = "user_id";
    SessionStorageQueryParam["guild_id"] = "guild_id";
    SessionStorageQueryParam["channel_id"] = "channel_id";
    return SessionStorageQueryParam;
}(SessionStorageQueryParam || {});
function getOverrideOrRandomSessionValue(queryParam) {
    const overrideValue = queryParams.get(queryParam);
    if (overrideValue != null) {
        return overrideValue;
    }
    const currentStoredValue = sessionStorage.getItem(queryParam);
    if (currentStoredValue != null) {
        return currentStoredValue;
    }
    // Set queryParam to a random 8-character string
    const randomString = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(queryParam, randomString);
    return randomString;
}
const DiscordContext = /*#__PURE__*/ createContext({
    accessToken: null,
    authenticated: false,
    discordSdk: discordSdk,
    error: null,
    session: {
        user: {
            id: '',
            username: '',
            discriminator: '',
            avatar: null,
            public_flags: 0
        },
        access_token: '',
        scopes: [],
        expires: '',
        application: {
            rpc_origins: undefined,
            id: '',
            name: '',
            icon: null,
            description: ''
        }
    },
    status: 'pending'
});
export function DiscordContextProvider(props) {
    const { authenticate, children, loadingScreen = null, scope } = props;
    const setupResult = useDiscordSdkSetup({
        authenticate,
        scope
    });
    if (loadingScreen && ![
        'error',
        'ready'
    ].includes(setupResult.status)) {
        return /*#__PURE__*/ React.createElement(React.Fragment, null, loadingScreen);
    }
    return /*#__PURE__*/ React.createElement(DiscordContext.Provider, {
        value: setupResult
    }, children);
}
export function useDiscordSdk() {
    return useContext(DiscordContext);
}
/**
 * Authenticate with Discord and return the access token.
 * See full list of scopes: https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes
 *
 * @param scope The scope of the authorization (default: ['identify', 'guilds'])
 * @returns The result of the Discord SDK `authenticate()` command
 */ export async function authenticateSdk(options) {
    const { scope = [
        'identify',
        'guilds'
    ] } = options ?? {};
    await discordSdk.ready();
    const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: scope
    });
    const response = await fetch('/.proxy/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code
        })
    });
    const { access_token } = await response.json();
    // Authenticate with Discord client (using the access_token)
    const auth = await discordSdk.commands.authenticate({
        access_token
    });
    if (auth == null) {
        throw new Error('Authenticate command failed');
    }
    return {
        accessToken: access_token,
        auth
    };
}
export function useDiscordSdkSetup(options) {
    const { authenticate, scope } = options ?? {};
    const [accessToken, setAccessToken] = useState(null);
    const [session, setSession] = useState(null);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('pending');
    const setupDiscordSdk = useCallback(async ()=>{
        try {
            setStatus('loading');
            await discordSdk.ready();
            if (authenticate) {
                setStatus('authenticating');
                const { accessToken, auth } = await authenticateSdk({
                    scope
                });
                setAccessToken(accessToken);
                setSession(auth);
            }
            setStatus('ready');
        } catch (e) {
            console.error(e);
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred');
            }
            setStatus('error');
        }
    }, [
        authenticate
    ]);
    useStableEffect(()=>{
        setupDiscordSdk();
    });
    return {
        accessToken,
        authenticated: !!accessToken,
        discordSdk,
        error,
        session,
        status
    };
}
/**
 * React in development mode re-mounts the root component initially.
 * This hook ensures that the callback is only called once, preventing double authentication.
 */ function useStableEffect(callback) {
    const isRunning = useRef(false);
    useEffect(()=>{
        if (!isRunning.current) {
            isRunning.current = true;
            callback();
        }
    }, []);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkQ6XFxkaXNjXFxhbnRvbmJhbGxcXHNyY1xcaG9va3NcXHVzZURpc2NvcmRTZGsudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERpc2NvcmRTREssIERpc2NvcmRTREtNb2NrIH0gZnJvbSAnQGRpc2NvcmQvZW1iZWRkZWQtYXBwLXNkaydcbmltcG9ydCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZUNhbGxiYWNrLCB1c2VSZWYsIGNyZWF0ZUNvbnRleHQsIHVzZUNvbnRleHQgfSBmcm9tICdyZWFjdCdcbmltcG9ydCB0eXBlIHsgUmVhY3ROb2RlIH0gZnJvbSAncmVhY3QnXG5cbnR5cGUgVW53cmFwUHJvbWlzZTxUPiA9IFQgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFU+ID8gVSA6IFRcbnR5cGUgRGlzY29yZFNlc3Npb24gPSBVbndyYXBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIGRpc2NvcmRTZGsuY29tbWFuZHMuYXV0aGVudGljYXRlPj5cbnR5cGUgQXV0aG9yaXplSW5wdXQgPSBQYXJhbWV0ZXJzPHR5cGVvZiBkaXNjb3JkU2RrLmNvbW1hbmRzLmF1dGhvcml6ZT5bMF1cbnR5cGUgU2RrU2V0dXBSZXN1bHQgPSBSZXR1cm5UeXBlPHR5cGVvZiB1c2VEaXNjb3JkU2RrU2V0dXA+XG5cbmNvbnN0IHF1ZXJ5UGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKVxuY29uc3QgaXNFbWJlZGRlZCA9IHF1ZXJ5UGFyYW1zLmdldCgnZnJhbWVfaWQnKSAhPSBudWxsXG5cbmxldCBkaXNjb3JkU2RrOiBEaXNjb3JkU0RLIHwgRGlzY29yZFNES01vY2tcblxuaWYgKGlzRW1iZWRkZWQpIHtcblx0ZGlzY29yZFNkayA9IG5ldyBEaXNjb3JkU0RLKGltcG9ydC5tZXRhLmVudi5WSVRFX0RJU0NPUkRfQ0xJRU5UX0lEKVxufSBlbHNlIHtcblx0Ly8gV2UncmUgdXNpbmcgc2Vzc2lvbiBzdG9yYWdlIGZvciB1c2VyX2lkLCBndWlsZF9pZCwgYW5kIGNoYW5uZWxfaWRcblx0Ly8gVGhpcyB3YXkgdGhlIHVzZXIvZ3VpbGQvY2hhbm5lbCB3aWxsIGJlIG1haW50YWluZWQgdW50aWwgdGhlIHRhYiBpcyBjbG9zZWQsIGV2ZW4gaWYgeW91IHJlZnJlc2hcblx0Ly8gU2Vzc2lvbiBzdG9yYWdlIHdpbGwgZ2VuZXJhdGUgbmV3IHVuaXF1ZSBtb2NrcyBmb3IgZWFjaCB0YWIgeW91IG9wZW5cblx0Ly8gQW55IG9mIHRoZXNlIHZhbHVlcyBjYW4gYmUgb3ZlcnJpZGRlbiB2aWEgcXVlcnkgcGFyYW1ldGVyc1xuXHQvLyBpLmUuIGlmIHlvdSBzZXQgaHR0cHM6Ly9teS10dW5uZWwtdXJsLmNvbS8/dXNlcl9pZD10ZXN0X3VzZXJfaWRcblx0Ly8gdGhpcyB3aWxsIG92ZXJyaWRlIHRoaXMgd2lsbCBvdmVycmlkZSB0aGUgc2Vzc2lvbiB1c2VyX2lkIHZhbHVlXG5cdGNvbnN0IG1vY2tVc2VySWQgPSBnZXRPdmVycmlkZU9yUmFuZG9tU2Vzc2lvblZhbHVlKCd1c2VyX2lkJylcblx0Y29uc3QgbW9ja0d1aWxkSWQgPSBnZXRPdmVycmlkZU9yUmFuZG9tU2Vzc2lvblZhbHVlKCdndWlsZF9pZCcpXG5cdGNvbnN0IG1vY2tDaGFubmVsSWQgPSBnZXRPdmVycmlkZU9yUmFuZG9tU2Vzc2lvblZhbHVlKCdjaGFubmVsX2lkJylcblxuXHRkaXNjb3JkU2RrID0gbmV3IERpc2NvcmRTREtNb2NrKGltcG9ydC5tZXRhLmVudi5WSVRFX0RJU0NPUkRfQ0xJRU5UX0lELCBtb2NrR3VpbGRJZCwgbW9ja0NoYW5uZWxJZClcblx0Y29uc3QgZGlzY3JpbWluYXRvciA9IFN0cmluZyhtb2NrVXNlcklkLmNoYXJDb2RlQXQoMCkgJSA1KVxuXG5cdGRpc2NvcmRTZGsuX3VwZGF0ZUNvbW1hbmRNb2Nrcyh7XG5cdFx0YXV0aGVudGljYXRlOiBhc3luYyAoKSA9PiB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRhY2Nlc3NfdG9rZW46ICdtb2NrX3Rva2VuJyxcblx0XHRcdFx0dXNlcjoge1xuXHRcdFx0XHRcdHVzZXJuYW1lOiBtb2NrVXNlcklkLFxuXHRcdFx0XHRcdGRpc2NyaW1pbmF0b3IsXG5cdFx0XHRcdFx0aWQ6IG1vY2tVc2VySWQsXG5cdFx0XHRcdFx0YXZhdGFyOiBudWxsLFxuXHRcdFx0XHRcdHB1YmxpY19mbGFnczogMVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzY29wZXM6IFtdLFxuXHRcdFx0XHRleHBpcmVzOiBuZXcgRGF0ZSgyMTEyLCAxLCAxKS50b1N0cmluZygpLFxuXHRcdFx0XHRhcHBsaWNhdGlvbjoge1xuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiAnbW9ja19hcHBfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdGljb246ICdtb2NrX2FwcF9pY29uJyxcblx0XHRcdFx0XHRpZDogJ21vY2tfYXBwX2lkJyxcblx0XHRcdFx0XHRuYW1lOiAnbW9ja19hcHBfbmFtZSdcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSlcbn1cblxuZXhwb3J0IHsgZGlzY29yZFNkayB9XG5cbmVudW0gU2Vzc2lvblN0b3JhZ2VRdWVyeVBhcmFtIHtcblx0dXNlcl9pZCA9ICd1c2VyX2lkJyxcblx0Z3VpbGRfaWQgPSAnZ3VpbGRfaWQnLFxuXHRjaGFubmVsX2lkID0gJ2NoYW5uZWxfaWQnXG59XG5cbmZ1bmN0aW9uIGdldE92ZXJyaWRlT3JSYW5kb21TZXNzaW9uVmFsdWUocXVlcnlQYXJhbTogYCR7U2Vzc2lvblN0b3JhZ2VRdWVyeVBhcmFtfWApIHtcblx0Y29uc3Qgb3ZlcnJpZGVWYWx1ZSA9IHF1ZXJ5UGFyYW1zLmdldChxdWVyeVBhcmFtKVxuXHRpZiAob3ZlcnJpZGVWYWx1ZSAhPSBudWxsKSB7XG5cdFx0cmV0dXJuIG92ZXJyaWRlVmFsdWVcblx0fVxuXG5cdGNvbnN0IGN1cnJlbnRTdG9yZWRWYWx1ZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0ocXVlcnlQYXJhbSlcblx0aWYgKGN1cnJlbnRTdG9yZWRWYWx1ZSAhPSBudWxsKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRTdG9yZWRWYWx1ZVxuXHR9XG5cblx0Ly8gU2V0IHF1ZXJ5UGFyYW0gdG8gYSByYW5kb20gOC1jaGFyYWN0ZXIgc3RyaW5nXG5cdGNvbnN0IHJhbmRvbVN0cmluZyA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDEwKVxuXHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKHF1ZXJ5UGFyYW0sIHJhbmRvbVN0cmluZylcblx0cmV0dXJuIHJhbmRvbVN0cmluZ1xufVxuXG5jb25zdCBEaXNjb3JkQ29udGV4dCA9IGNyZWF0ZUNvbnRleHQ8U2RrU2V0dXBSZXN1bHQ+KHtcblx0YWNjZXNzVG9rZW46IG51bGwsXG5cdGF1dGhlbnRpY2F0ZWQ6IGZhbHNlLFxuXHRkaXNjb3JkU2RrOiBkaXNjb3JkU2RrLFxuXHRlcnJvcjogbnVsbCxcblx0c2Vzc2lvbjoge1xuXHRcdHVzZXI6IHtcblx0XHRcdGlkOiAnJyxcblx0XHRcdHVzZXJuYW1lOiAnJyxcblx0XHRcdGRpc2NyaW1pbmF0b3I6ICcnLFxuXHRcdFx0YXZhdGFyOiBudWxsLFxuXHRcdFx0cHVibGljX2ZsYWdzOiAwXG5cdFx0fSxcblx0XHRhY2Nlc3NfdG9rZW46ICcnLFxuXHRcdHNjb3BlczogW10sXG5cdFx0ZXhwaXJlczogJycsXG5cdFx0YXBwbGljYXRpb246IHtcblx0XHRcdHJwY19vcmlnaW5zOiB1bmRlZmluZWQsXG5cdFx0XHRpZDogJycsXG5cdFx0XHRuYW1lOiAnJyxcblx0XHRcdGljb246IG51bGwsXG5cdFx0XHRkZXNjcmlwdGlvbjogJydcblx0XHR9XG5cdH0sXG5cdHN0YXR1czogJ3BlbmRpbmcnXG59KVxuXG5pbnRlcmZhY2UgRGlzY29yZENvbnRleHRQcm92aWRlclByb3BzIHtcblx0YXV0aGVudGljYXRlPzogYm9vbGVhblxuXHRjaGlsZHJlbjogUmVhY3ROb2RlXG5cdGxvYWRpbmdTY3JlZW4/OiBSZWFjdE5vZGVcblx0c2NvcGU/OiBBdXRob3JpemVJbnB1dFsnc2NvcGUnXVxufVxuZXhwb3J0IGZ1bmN0aW9uIERpc2NvcmRDb250ZXh0UHJvdmlkZXIocHJvcHM6IERpc2NvcmRDb250ZXh0UHJvdmlkZXJQcm9wcykge1xuXHRjb25zdCB7IGF1dGhlbnRpY2F0ZSwgY2hpbGRyZW4sIGxvYWRpbmdTY3JlZW4gPSBudWxsLCBzY29wZSB9ID0gcHJvcHNcblx0Y29uc3Qgc2V0dXBSZXN1bHQgPSB1c2VEaXNjb3JkU2RrU2V0dXAoeyBhdXRoZW50aWNhdGUsIHNjb3BlIH0pXG5cblx0aWYgKGxvYWRpbmdTY3JlZW4gJiYgIVsnZXJyb3InLCAncmVhZHknXS5pbmNsdWRlcyhzZXR1cFJlc3VsdC5zdGF0dXMpKSB7XG5cdFx0cmV0dXJuIDw+e2xvYWRpbmdTY3JlZW59PC8+XG5cdH1cblxuXHRyZXR1cm4gPERpc2NvcmRDb250ZXh0LlByb3ZpZGVyIHZhbHVlPXtzZXR1cFJlc3VsdH0+e2NoaWxkcmVufTwvRGlzY29yZENvbnRleHQuUHJvdmlkZXI+XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VEaXNjb3JkU2RrKCkge1xuXHRyZXR1cm4gdXNlQ29udGV4dChEaXNjb3JkQ29udGV4dClcbn1cblxuaW50ZXJmYWNlIEF1dGhlbnRpY2F0ZVNka09wdGlvbnMge1xuXHRzY29wZT86IEF1dGhvcml6ZUlucHV0WydzY29wZSddXG59XG5cbi8qKlxuICogQXV0aGVudGljYXRlIHdpdGggRGlzY29yZCBhbmQgcmV0dXJuIHRoZSBhY2Nlc3MgdG9rZW4uXG4gKiBTZWUgZnVsbCBsaXN0IG9mIHNjb3BlczogaHR0cHM6Ly9kaXNjb3JkLmNvbS9kZXZlbG9wZXJzL2RvY3MvdG9waWNzL29hdXRoMiNzaGFyZWQtcmVzb3VyY2VzLW9hdXRoMi1zY29wZXNcbiAqXG4gKiBAcGFyYW0gc2NvcGUgVGhlIHNjb3BlIG9mIHRoZSBhdXRob3JpemF0aW9uIChkZWZhdWx0OiBbJ2lkZW50aWZ5JywgJ2d1aWxkcyddKVxuICogQHJldHVybnMgVGhlIHJlc3VsdCBvZiB0aGUgRGlzY29yZCBTREsgYGF1dGhlbnRpY2F0ZSgpYCBjb21tYW5kXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhdXRoZW50aWNhdGVTZGsob3B0aW9ucz86IEF1dGhlbnRpY2F0ZVNka09wdGlvbnMpIHtcblx0Y29uc3QgeyBzY29wZSA9IFsnaWRlbnRpZnknLCAnZ3VpbGRzJ10gfSA9IG9wdGlvbnMgPz8ge31cblxuXHRhd2FpdCBkaXNjb3JkU2RrLnJlYWR5KClcblx0Y29uc3QgeyBjb2RlIH0gPSBhd2FpdCBkaXNjb3JkU2RrLmNvbW1hbmRzLmF1dGhvcml6ZSh7XG5cdFx0Y2xpZW50X2lkOiBpbXBvcnQubWV0YS5lbnYuVklURV9ESVNDT1JEX0NMSUVOVF9JRCxcblx0XHRyZXNwb25zZV90eXBlOiAnY29kZScsXG5cdFx0c3RhdGU6ICcnLFxuXHRcdHByb21wdDogJ25vbmUnLFxuXHRcdHNjb3BlOiBzY29wZVxuXHR9KVxuXG5cdGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJy8ucHJveHkvYXBpL3Rva2VuJywge1xuXHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdGhlYWRlcnM6IHtcblx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcblx0XHR9LFxuXHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgY29kZSB9KVxuXHR9KVxuXHRjb25zdCB7IGFjY2Vzc190b2tlbiB9ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpXG5cblx0Ly8gQXV0aGVudGljYXRlIHdpdGggRGlzY29yZCBjbGllbnQgKHVzaW5nIHRoZSBhY2Nlc3NfdG9rZW4pXG5cdGNvbnN0IGF1dGggPSBhd2FpdCBkaXNjb3JkU2RrLmNvbW1hbmRzLmF1dGhlbnRpY2F0ZSh7IGFjY2Vzc190b2tlbiB9KVxuXG5cdGlmIChhdXRoID09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0ZSBjb21tYW5kIGZhaWxlZCcpXG5cdH1cblx0cmV0dXJuIHsgYWNjZXNzVG9rZW46IGFjY2Vzc190b2tlbiwgYXV0aCB9XG59XG5cbmludGVyZmFjZSBVc2VEaXNjb3JkU2RrU2V0dXBPcHRpb25zIHtcblx0YXV0aGVudGljYXRlPzogYm9vbGVhblxuXHRzY29wZT86IEF1dGhvcml6ZUlucHV0WydzY29wZSddXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VEaXNjb3JkU2RrU2V0dXAob3B0aW9ucz86IFVzZURpc2NvcmRTZGtTZXR1cE9wdGlvbnMpIHtcblx0Y29uc3QgeyBhdXRoZW50aWNhdGUsIHNjb3BlIH0gPSBvcHRpb25zID8/IHt9XG5cdGNvbnN0IFthY2Nlc3NUb2tlbiwgc2V0QWNjZXNzVG9rZW5dID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbClcblx0Y29uc3QgW3Nlc3Npb24sIHNldFNlc3Npb25dID0gdXNlU3RhdGU8RGlzY29yZFNlc3Npb24gfCBudWxsPihudWxsKVxuXHRjb25zdCBbZXJyb3IsIHNldEVycm9yXSA9IHVzZVN0YXRlPHN0cmluZyB8IG51bGw+KG51bGwpXG5cdGNvbnN0IFtzdGF0dXMsIHNldFN0YXR1c10gPSB1c2VTdGF0ZTwnYXV0aGVudGljYXRpbmcnIHwgJ2Vycm9yJyB8ICdsb2FkaW5nJyB8ICdwZW5kaW5nJyB8ICdyZWFkeSc+KCdwZW5kaW5nJylcblxuXHRjb25zdCBzZXR1cERpc2NvcmRTZGsgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG5cdFx0dHJ5IHtcblx0XHRcdHNldFN0YXR1cygnbG9hZGluZycpXG5cdFx0XHRhd2FpdCBkaXNjb3JkU2RrLnJlYWR5KClcblxuXHRcdFx0aWYgKGF1dGhlbnRpY2F0ZSkge1xuXHRcdFx0XHRzZXRTdGF0dXMoJ2F1dGhlbnRpY2F0aW5nJylcblx0XHRcdFx0Y29uc3QgeyBhY2Nlc3NUb2tlbiwgYXV0aCB9ID0gYXdhaXQgYXV0aGVudGljYXRlU2RrKHsgc2NvcGUgfSlcblx0XHRcdFx0c2V0QWNjZXNzVG9rZW4oYWNjZXNzVG9rZW4pXG5cdFx0XHRcdHNldFNlc3Npb24oYXV0aClcblx0XHRcdH1cblxuXHRcdFx0c2V0U3RhdHVzKCdyZWFkeScpXG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKVxuXHRcdFx0aWYgKGUgaW5zdGFuY2VvZiBFcnJvcikge1xuXHRcdFx0XHRzZXRFcnJvcihlLm1lc3NhZ2UpXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZXRFcnJvcignQW4gdW5rbm93biBlcnJvciBvY2N1cnJlZCcpXG5cdFx0XHR9XG5cdFx0XHRzZXRTdGF0dXMoJ2Vycm9yJylcblx0XHR9XG5cdH0sIFthdXRoZW50aWNhdGVdKVxuXG5cdHVzZVN0YWJsZUVmZmVjdCgoKSA9PiB7XG5cdFx0c2V0dXBEaXNjb3JkU2RrKClcblx0fSlcblxuXHRyZXR1cm4geyBhY2Nlc3NUb2tlbiwgYXV0aGVudGljYXRlZDogISFhY2Nlc3NUb2tlbiwgZGlzY29yZFNkaywgZXJyb3IsIHNlc3Npb24sIHN0YXR1cyB9XG59XG5cbi8qKlxuICogUmVhY3QgaW4gZGV2ZWxvcG1lbnQgbW9kZSByZS1tb3VudHMgdGhlIHJvb3QgY29tcG9uZW50IGluaXRpYWxseS5cbiAqIFRoaXMgaG9vayBlbnN1cmVzIHRoYXQgdGhlIGNhbGxiYWNrIGlzIG9ubHkgY2FsbGVkIG9uY2UsIHByZXZlbnRpbmcgZG91YmxlIGF1dGhlbnRpY2F0aW9uLlxuICovXG5mdW5jdGlvbiB1c2VTdGFibGVFZmZlY3QoY2FsbGJhY2s6ICgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB7XG5cdGNvbnN0IGlzUnVubmluZyA9IHVzZVJlZihmYWxzZSlcblxuXHR1c2VFZmZlY3QoKCkgPT4ge1xuXHRcdGlmICghaXNSdW5uaW5nLmN1cnJlbnQpIHtcblx0XHRcdGlzUnVubmluZy5jdXJyZW50ID0gdHJ1ZVxuXHRcdFx0Y2FsbGJhY2soKVxuXHRcdH1cblx0fSwgW10pXG59XG4iXSwibmFtZXMiOlsiRGlzY29yZFNESyIsIkRpc2NvcmRTREtNb2NrIiwidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJ1c2VDYWxsYmFjayIsInVzZVJlZiIsImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwicXVlcnlQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImlzRW1iZWRkZWQiLCJnZXQiLCJkaXNjb3JkU2RrIiwiZW52IiwiVklURV9ESVNDT1JEX0NMSUVOVF9JRCIsIm1vY2tVc2VySWQiLCJnZXRPdmVycmlkZU9yUmFuZG9tU2Vzc2lvblZhbHVlIiwibW9ja0d1aWxkSWQiLCJtb2NrQ2hhbm5lbElkIiwiZGlzY3JpbWluYXRvciIsIlN0cmluZyIsImNoYXJDb2RlQXQiLCJfdXBkYXRlQ29tbWFuZE1vY2tzIiwiYXV0aGVudGljYXRlIiwiYWNjZXNzX3Rva2VuIiwidXNlciIsInVzZXJuYW1lIiwiaWQiLCJhdmF0YXIiLCJwdWJsaWNfZmxhZ3MiLCJzY29wZXMiLCJleHBpcmVzIiwiRGF0ZSIsInRvU3RyaW5nIiwiYXBwbGljYXRpb24iLCJkZXNjcmlwdGlvbiIsImljb24iLCJuYW1lIiwiU2Vzc2lvblN0b3JhZ2VRdWVyeVBhcmFtIiwicXVlcnlQYXJhbSIsIm92ZXJyaWRlVmFsdWUiLCJjdXJyZW50U3RvcmVkVmFsdWUiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJyYW5kb21TdHJpbmciLCJNYXRoIiwicmFuZG9tIiwic2xpY2UiLCJzZXRJdGVtIiwiRGlzY29yZENvbnRleHQiLCJhY2Nlc3NUb2tlbiIsImF1dGhlbnRpY2F0ZWQiLCJlcnJvciIsInNlc3Npb24iLCJycGNfb3JpZ2lucyIsInVuZGVmaW5lZCIsInN0YXR1cyIsIkRpc2NvcmRDb250ZXh0UHJvdmlkZXIiLCJwcm9wcyIsImNoaWxkcmVuIiwibG9hZGluZ1NjcmVlbiIsInNjb3BlIiwic2V0dXBSZXN1bHQiLCJ1c2VEaXNjb3JkU2RrU2V0dXAiLCJpbmNsdWRlcyIsIlByb3ZpZGVyIiwidmFsdWUiLCJ1c2VEaXNjb3JkU2RrIiwiYXV0aGVudGljYXRlU2RrIiwib3B0aW9ucyIsInJlYWR5IiwiY29kZSIsImNvbW1hbmRzIiwiYXV0aG9yaXplIiwiY2xpZW50X2lkIiwicmVzcG9uc2VfdHlwZSIsInN0YXRlIiwicHJvbXB0IiwicmVzcG9uc2UiLCJmZXRjaCIsIm1ldGhvZCIsImhlYWRlcnMiLCJib2R5IiwiSlNPTiIsInN0cmluZ2lmeSIsImpzb24iLCJhdXRoIiwiRXJyb3IiLCJzZXRBY2Nlc3NUb2tlbiIsInNldFNlc3Npb24iLCJzZXRFcnJvciIsInNldFN0YXR1cyIsInNldHVwRGlzY29yZFNkayIsImUiLCJjb25zb2xlIiwibWVzc2FnZSIsInVzZVN0YWJsZUVmZmVjdCIsImNhbGxiYWNrIiwiaXNSdW5uaW5nIiwiY3VycmVudCJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBU0EsVUFBVSxFQUFFQyxjQUFjLFFBQVEsNEJBQTJCO0FBQ3RFLFNBQVNDLFFBQVEsRUFBRUMsU0FBUyxFQUFFQyxXQUFXLEVBQUVDLE1BQU0sRUFBRUMsYUFBYSxFQUFFQyxVQUFVLFFBQVEsUUFBTztBQVEzRixNQUFNQyxjQUFjLElBQUlDLGdCQUFnQkMsT0FBT0MsUUFBUSxDQUFDQyxNQUFNO0FBQzlELE1BQU1DLGFBQWFMLFlBQVlNLEdBQUcsQ0FBQyxlQUFlO0FBRWxELElBQUlDO0FBRUosSUFBSUYsWUFBWTtJQUNmRSxhQUFhLElBQUlmLFdBQVcsWUFBWWdCLEdBQUcsQ0FBQ0Msc0JBQXNCO0FBQ25FLE9BQU87SUFDTixvRUFBb0U7SUFDcEUsa0dBQWtHO0lBQ2xHLHVFQUF1RTtJQUN2RSw2REFBNkQ7SUFDN0Qsa0VBQWtFO0lBQ2xFLGtFQUFrRTtJQUNsRSxNQUFNQyxhQUFhQyxnQ0FBZ0M7SUFDbkQsTUFBTUMsY0FBY0QsZ0NBQWdDO0lBQ3BELE1BQU1FLGdCQUFnQkYsZ0NBQWdDO0lBRXRESixhQUFhLElBQUlkLGVBQWUsWUFBWWUsR0FBRyxDQUFDQyxzQkFBc0IsRUFBRUcsYUFBYUM7SUFDckYsTUFBTUMsZ0JBQWdCQyxPQUFPTCxXQUFXTSxVQUFVLENBQUMsS0FBSztJQUV4RFQsV0FBV1UsbUJBQW1CLENBQUM7UUFDOUJDLGNBQWM7WUFDYixPQUFPO2dCQUNO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