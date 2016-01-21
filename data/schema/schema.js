import {
  GraphQL,
  GraphQLSchema,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLList
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  connectionFromPromisedArray,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
} from 'graphql-relay';

import {
  Conn,
  ConnQueries,
  getUser,
  publicSettings
} from '../db.js';

import GraphQLPage from './page.js';
import { GraphQLPost, PostsConnection } from './post.js';
import { GraphQLPostmeta, PostmetaConnection } from './postmeta.js';

let {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    const {type, id} = fromGlobalId(globalId);
    if (type === 'User') {
      return getUser(id);
    } else if (type === 'Setting') {
      return publicSettings
    } else if (type === 'Option') {
      return ConnQueries.getOptionById(id)
    } else if (type === 'Page') {
      return ConnQueries.getPostById(id)
    } else if (type === 'Post') {
      return ConnQueries.getPostById(id)
    } else if (type === 'Postmeta'){
      return ConnQueries.getPostmetaById(id)
    } else {
      return null
    }
  },
  (obj) => {
    if (obj instanceof User) {
      return GraphQLUser;
    } else if (obj instanceof Setting){
      return GraphQLSetting;
    } else if (obj instanceof Page){
      return GraphQLPage;
    } else if (obj instanceof Option){
      return GraphQLOption;
    } else if (obj instanceof Post){
      return GraphQLPost;
    } else if (obj instanceof Postmeta){
      return GraphQLPostmeta;
    } else {
      return null
    }
  }
)

const GraphQLOption = new GraphQLObjectType({
  name: 'Option',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve(root){
        return root.dataValues.option_id;
      }
    },
    option_name: { type: GraphQLString },
    option_value: { type: GraphQLString },
  })
});

const {
  connectionType: OptionConnection,
  edgeType: GraphQLOptionEdge,
} = connectionDefinitions({
  name: 'Option',
  nodeType: GraphQLOption
});

const GraphQLMenuItem = new GraphQLObjectType({
  name: 'MenuItem',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    linkedId: { type: GraphQLInt },
    order: { type: GraphQLInt },
    navitem: {
      type: GraphQLPost,
      resolve: (root) => {
        return ConnQueries.getPostById(root.linkedId)
      }
    },
    children: {
      type: new GraphQLList(GraphQLMenuItem),
      resolve: (root) => {
        return root.children
      }
    }
  })
});

const GraphQLMenu = new GraphQLObjectType({
  name: 'Menu',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    items: {
      type: new GraphQLList(GraphQLMenuItem)
    }
  }),
  interfaces: [nodeInterface]
});

const GraphQLSetting = new GraphQLObjectType({
  name: 'Setting',
  fields: {
    id: globalIdField("User"),
    uploads: { type: GraphQLString }
  }
});

const GraphQLUser = new GraphQLObjectType({
  name: "User",
  fields: {
    id: globalIdField("User"),
    settings: {
      type: GraphQLSetting,
      resolve: ()=>{
        return publicSettings
      }
    },
    options: {
      type: OptionConnection,
      args: connectionArgs,
      resolve: (root, args) => {
        return connectionFromPromisedArray( ConnQueries.getOptions(), args);
      }
    },
    posts: {
      type: PostsConnection,
      args: {
        post_type: {
          type: GraphQLString,
          defaultValue: 'post'
        },
        ...connectionArgs
      },
      resolve(root, args) {
        return connectionFromPromisedArray( ConnQueries.getPosts(args.post_type), args );
      }
    },
    page: {
      type: GraphQLPost,
      args:{
        post_name:{ type: GraphQLString },
      },
      resolve(root, args){
        return ConnQueries.getPostByName(args.post_name);
      }
    },
    menus: {
      type: GraphQLMenu,
      args: {
        name: { type: GraphQLString }
      },
      resolve(root, args) {
        return ConnQueries.getMenu(args.name);
      }
    },
    postmeta: {
      type: PostmetaConnection,
      args: {
        post_id: {
          type: GraphQLInt
        },
        ...connectionArgs
      },
      resolve(root, args){
        return ConnQueries.getPostmeta(args.post_id)
      }
    }
  },
  interfaces: [nodeInterface]
})

const GraphQLRoot = new GraphQLObjectType({
  name: 'Root',
  fields: {
    viewer: {
      type: GraphQLUser,
      resolve: () => {
        return ConnQueries.getViewer();
      }
    }
  }
});

const Schema = new GraphQLSchema({
  query: GraphQLRoot
});
export default Schema;
