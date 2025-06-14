import { schema, type Schema } from './schema.gen';
import {
  ANYONE_CAN,
  definePermissions,
  type ExpressionBuilder,
  type PermissionsConfig,
  type Row,
} from '@rocicorp/zero';

export { schema, type Schema };

export type Message = Row<Schema['tables']['messages']>;
export type User = Row<Schema['tables']['users']>;

// The contents of your decoded JWT.
type AuthData = {
  sub: string | null;
};

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const allowIfLoggedIn = (
    authData: AuthData,
    { cmpLit }: ExpressionBuilder<Schema, keyof Schema['tables']>,
  ) => cmpLit(authData.sub, 'IS NOT', null);

  const allowIfIsMessageSender = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, 'messages'>,
  ) => cmp('senderId', '=', authData.sub ?? '');

  const allowIfMessageSenderIsSelf = (
    authData: AuthData,
    { or, cmp }: ExpressionBuilder<Schema, 'messages'>,
  ) =>
    or(cmp('senderId', 'IS', null), cmp('senderId', '=', authData.sub ?? ''));

  return {
    users: {
      row: {
        select: ANYONE_CAN,
      },
    },
    messages: {
      row: {
        // anyone can insert, but the senderId of the message must match the current user
        insert: [allowIfMessageSenderIsSelf],
        update: {
          // sender can only edit own messages
          preMutation: [allowIfIsMessageSender],
          // sender can only edit messages to be owned by themselves
          postMutation: [allowIfIsMessageSender],
        },
        // must be logged in to delete
        delete: [allowIfLoggedIn],
        // everyone can read current messages
        select: ANYONE_CAN,
      },
    },
  } satisfies PermissionsConfig<AuthData, Schema>;
});
