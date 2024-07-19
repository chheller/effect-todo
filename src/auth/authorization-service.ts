import { Brand, Context } from "effect";

export type Permission = {
    mnemonic: string;
    displayValue: string;
} & Brand.Brand<"Permission">
export const Permission = Brand.nominal<Permission>();

export type UserId = string & Brand.Brand<"UserId">
export const UserId = Brand.nominal<UserId>();

export interface AuthorizationService {
    readonly hasPermission: (userId: UserId, ...permissions: Permission[])
}

export const AuthorizationService = Context.GenericTag<AuthorizationService>("AuthorizationService");

export const makeAuthorizationService = Effect.gen(function*() {
    const authzProvider = yield* AuthorizationProvider.AuthorizationProvider;
})