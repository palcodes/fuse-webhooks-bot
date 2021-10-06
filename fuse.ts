import FusePoolLensArtifact from "./abis/FusePoolLens.json";
import FusePoolLensV2Artifact from "./abis/FusePoolLensV2.json";
import FusePoolUsersLensArtifact from "./abis/FusePoolUsersLens.json";
import addrs from "./addrs";
import Web3 from "web3";
import Big from "big.js";

Big.RM = 0;
const FusePoolLensAddr = addrs[137].FUSE_POOL_LENS_CONTRACT_ADDRESS;
const FusePoolLensV2Addr = addrs[137].FUSE_POOL_LENS_V2_CONTRACT_ADDRESS;
const FusePooUserslLensAddr = addrs[137].FUSE_POOL_USERS_LENS_CONTRACT_ADDRESS;

export const web3 = new Web3(
  new Web3.providers.WebsocketProvider(process.env.RPC_URL!)
);
export const fusePoolLens = new web3.eth.Contract(
  FusePoolLensArtifact.abi as any,
  FusePoolLensAddr
);

export const fusePoolLensV2 = new web3.eth.Contract(
  FusePoolLensV2Artifact.abi as any,
  FusePoolLensV2Addr
);

export const fusePoolUsersLens = new web3.eth.Contract(
  FusePoolUsersLensArtifact.abi as any,
  FusePooUserslLensAddr
);
