import { Client } from 'graphql-ws'
import { GraphQLClient, GraphQLWebSocketClient } from 'graphql-request'
import { Observable } from 'rxjs'
import { DocumentNode, Kind, print } from 'graphql'
function operationType(data: DocumentNode) {
	for (const def of data.definitions) {
		if (def.kind === Kind.OPERATION_DEFINITION) {
			return def.operation
		}
	}
	return
}

export type Requester<C = {}> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> & Observable<R>
export function createRequester(options: { websocket?: GraphQLWebSocketClient; request?: GraphQLClient }): Requester {
	return (query, vars) => {
		const op = operationType(query)
		if (op === 'subscription') {
			const ws = options.websocket
			if (ws == null) throw new Error('Websocket Client is not provided!')
			return new Observable<any>((observer) => {
				return ws.subscribe(
					query,
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
					},
					vars
				)
			}) as any
		}
		const req = options.request
		if (req == null) throw new Error('GraphQLClient is not provided!')

		return req.rawRequest(print(query), vars).then((q) => q.data)
	}
}
