import { Client } from 'graphql-ws'
import { GraphQLClient } from 'graphql-request'
import { Observable } from 'rxjs'
import { DocumentNode, Kind, print } from 'graphql'
import { createClient } from 'graphql-ws'
function operationType(data: DocumentNode) {
	for (const def of data.definitions) {
		if (def.kind === Kind.OPERATION_DEFINITION) {
			return def.operation
		}
	}
	return
}

export type Requester<C = {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> & Observable<R>

export function easySetupRequester(args: {
	ws?: { url: string; wsImplementation?: unknown }
	request?: { url: string }
	headers: Promise<() => Record<string, string>>
}) {
	const wsClient = args.ws
		? createClient({
				webSocketImpl: args.ws.wsImplementation,
				url: args.ws.url,
				connectionParams: async () => {
					return {
						headers: args.headers,
					}
				},
		  })
		: undefined

	const makeRequestClient = () => {
		if (args.request == null) return
		return new GraphQLClient(args.request.url, { headers: args.headers as any })
	}
	const requestClient = makeRequestClient()

	return createRequester({
		websocket: wsClient,
		request: requestClient,
	})
}

export function createRequester(options: { websocket?: Client; request?: GraphQLClient }): Requester {
	return (query, vars) => {
		const op = operationType(query)
		if (op === 'subscription') {
			const ws = options.websocket
			if (ws == null) throw new Error('Websocket Client is not provided!')
			return new Observable<any>((observer) => {
				return ws.subscribe(
					{ query: print(query), variables: vars as any },
					{
						next: (c) => {
							observer.next(c.data)
						},
						complete: () => {
							observer.complete()
						},
						error: (err) => {
							observer.error(err)
						},
					}
				)
			}) as any
		}
		const req = options.request
		if (req == null) throw new Error('GraphQLClient is not provided!')

		return req.rawRequest(print(query), vars).then((q) => q.data)
	}
}
