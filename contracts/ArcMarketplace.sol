// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ArcNFT.sol";

/**
 * @title ArcMarketplace
 * @dev NFT Marketplace with listings, offers, and auctions - Part of ArcGallery
 * Supports automatic royalty payments to creators
 * @author Built for Arc Layer 1
 */
contract ArcMarketplace is ReentrancyGuard, Ownable {
    
    // Platform fee in basis points (250 = 2.5%)
    uint256 public platformFee = 250;
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }
    
    struct Offer {
        address buyer;
        uint256 price;
        uint256 expiresAt;
        bool active;
    }
    
    struct Auction {
        address seller;
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }
    
    // NFT address -> Token ID -> Listing
    mapping(address => mapping(uint256 => Listing)) public listings;
    
    // NFT address -> Token ID -> Buyer address -> Offer
    mapping(address => mapping(uint256 => mapping(address => Offer))) public offers;
    
    // NFT address -> Token ID -> Auction
    mapping(address => mapping(uint256 => Auction)) public auctions;
    
    // Sales tracking for statistics
    uint256 public totalSales;
    uint256 public totalVolume;
    
    // Events
    event ItemListed(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    
    event ItemSold(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price
    );
    
    event ListingCancelled(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller
    );
    
    event ListingUpdated(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 oldPrice,
        uint256 newPrice
    );
    
    event OfferMade(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price,
        uint256 expiresAt
    );
    
    event OfferAccepted(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price
    );
    
    event OfferCancelled(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed buyer
    );
    
    event AuctionCreated(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 startPrice,
        uint256 endTime
    );
    
    event BidPlaced(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionEnded(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed winner,
        uint256 amount
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev List an NFT for sale
     * Seller must approve marketplace first
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) public nonReentrant {
        require(price > 0, "Price must be greater than 0");
        require(nftAddress != address(0), "Invalid NFT address");
        
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        // cancel any existing listing for this token
        if (listings[nftAddress][tokenId].active) {
            listings[nftAddress][tokenId].active = false;
        }
        
        listings[nftAddress][tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });
        
        emit ItemListed(nftAddress, tokenId, msg.sender, price);
    }
    
    /**
     * @dev Buy a listed NFT
     * Handles royalties and platform fees automatically
     */
    function buyItem(address nftAddress, uint256 tokenId) 
        public 
        payable 
        nonReentrant 
    {
        Listing memory listing = listings[nftAddress][tokenId];
        require(listing.active, "Item not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own NFT");
        
        // mark as inactive before transfers (reentrancy protection)
        listings[nftAddress][tokenId].active = false;
        
        // distribute payments (royalties + fees)
        _distributeFunds(nftAddress, tokenId, listing.seller, listing.price);
        
        // transfer the NFT
        IERC721(nftAddress).safeTransferFrom(listing.seller, msg.sender, tokenId);
        
        // update stats
        totalSales++;
        totalVolume += listing.price;
        
        emit ItemSold(nftAddress, tokenId, listing.seller, msg.sender, listing.price);
        
        // refund any excess payment
        if (msg.value > listing.price) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @dev Cancel a listing
     */
    function cancelListing(address nftAddress, uint256 tokenId) public {
        Listing memory listing = listings[nftAddress][tokenId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Listing not active");
        
        listings[nftAddress][tokenId].active = false;
        
        emit ListingCancelled(nftAddress, tokenId, msg.sender);
    }
    
    /**
     * @dev Update listing price
     * Only the seller can update the price of their active listing
     */
    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) public nonReentrant {
        require(newPrice > 0, "Price must be greater than 0");
        
        Listing storage listing = listings[nftAddress][tokenId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        uint256 oldPrice = listing.price;
        listing.price = newPrice;
        
        emit ListingUpdated(nftAddress, tokenId, msg.sender, oldPrice, newPrice);
    }
    
    /**
     * @dev Make an offer on any NFT (even if not listed)
     * ETH is held in escrow until offer expires or is accepted
     */
    function makeOffer(
        address nftAddress,
        uint256 tokenId,
        uint256 duration
    ) public payable nonReentrant {
        require(msg.value > 0, "Offer must be greater than 0");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        require(nftAddress != address(0), "Invalid NFT address");
        
        // if user already has an active offer, refund it first
        Offer storage existingOffer = offers[nftAddress][tokenId][msg.sender];
        if (existingOffer.active) {
            existingOffer.active = false;
            (bool success, ) = payable(msg.sender).call{value: existingOffer.price}("");
            require(success, "Refund failed");
        }
        
        uint256 expiresAt = block.timestamp + duration;
        
        offers[nftAddress][tokenId][msg.sender] = Offer({
            buyer: msg.sender,
            price: msg.value,
            expiresAt: expiresAt,
            active: true
        });
        
        emit OfferMade(nftAddress, tokenId, msg.sender, msg.value, expiresAt);
    }
    
    /**
     * @dev Accept an offer for your NFT
     * Buyer's ETH is released from escrow
     */
    function acceptOffer(
        address nftAddress,
        uint256 tokenId,
        address buyer
    ) public nonReentrant {
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(buyer != address(0), "Invalid buyer address");
        require(buyer != msg.sender, "Cannot accept your own offer");
        
        Offer memory offer = offers[nftAddress][tokenId][buyer];
        require(offer.active, "Offer not active");
        require(block.timestamp <= offer.expiresAt, "Offer expired");
        
        // mark offer as inactive before transfers
        offers[nftAddress][tokenId][buyer].active = false;
        
        // distribute payment
        _distributeFunds(nftAddress, tokenId, msg.sender, offer.price);
        
        // transfer NFT to buyer
        nft.safeTransferFrom(msg.sender, buyer, tokenId);
        
        // cancel active listing if exists
        if (listings[nftAddress][tokenId].active) {
            listings[nftAddress][tokenId].active = false;
        }
        
        totalSales++;
        totalVolume += offer.price;
        
        emit OfferAccepted(nftAddress, tokenId, msg.sender, buyer, offer.price);
    }
    
    /**
     * @dev Cancel your offer and get refund
     */
    function cancelOffer(address nftAddress, uint256 tokenId) public nonReentrant {
        Offer memory offer = offers[nftAddress][tokenId][msg.sender];
        require(offer.active, "No active offer");
        
        offers[nftAddress][tokenId][msg.sender].active = false;
        
        // refund the escrowed ETH
        (bool success, ) = payable(msg.sender).call{value: offer.price}("");
        require(success, "Refund failed");
        
        emit OfferCancelled(nftAddress, tokenId, msg.sender);
    }
    
    /**
     * @dev Start an auction for your NFT
     * Min 1 hour, max 7 days duration
     */
    function createAuction(
        address nftAddress,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) public nonReentrant {
        require(startPrice > 0, "Start price must be greater than 0");
        require(duration >= 1 hours && duration <= 7 days, "Invalid duration");
        require(nftAddress != address(0), "Invalid NFT address");
        
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        // make sure there's no active auction already
        require(!auctions[nftAddress][tokenId].active, "Auction already active");
        
        uint256 endTime = block.timestamp + duration;
        
        auctions[nftAddress][tokenId] = Auction({
            seller: msg.sender,
            startPrice: startPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: endTime,
            active: true
        });
        
        emit AuctionCreated(nftAddress, tokenId, msg.sender, startPrice, endTime);
    }
    
    /**
     * @dev Place a bid on an active auction
     * Previous highest bidder gets refunded automatically
     */
    function placeBid(address nftAddress, uint256 tokenId) 
        public 
        payable 
        nonReentrant 
    {
        Auction storage auction = auctions[nftAddress][tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Cannot bid on your own auction");
        require(msg.value >= auction.startPrice, "Bid below start price");
        require(msg.value > auction.highestBid, "Bid not high enough");
        
        // refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            (bool success, ) = payable(auction.highestBidder).call{value: auction.highestBid}("");
            require(success, "Refund to previous bidder failed");
        }
        
        // update auction with new highest bid
        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
        
        emit BidPlaced(nftAddress, tokenId, msg.sender, msg.value);
    }
    
    /**
     * @dev End an auction after time expires
     * Anyone can call this, but only after endTime
     */
    function endAuction(address nftAddress, uint256 tokenId) public nonReentrant {
        Auction storage auction = auctions[nftAddress][tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended yet");
        
        auction.active = false;
        
        // if there were bids, complete the sale
        if (auction.highestBidder != address(0)) {
            // distribute funds (royalties + fees)
            _distributeFunds(
                nftAddress,
                tokenId,
                auction.seller,
                auction.highestBid
            );
            
            // transfer NFT to winner
            IERC721(nftAddress).safeTransferFrom(
                auction.seller,
                auction.highestBidder,
                tokenId
            );
            
            totalSales++;
            totalVolume += auction.highestBid;
            
            emit AuctionEnded(nftAddress, tokenId, auction.highestBidder, auction.highestBid);
        } else {
            // no bids, auction failed
            emit AuctionEnded(nftAddress, tokenId, address(0), 0);
        }
    }
    
    /**
     * @dev Internal function to handle payment distribution
     * Pays royalties to creator, platform fee to owner, rest to seller
     */
    function _distributeFunds(
        address nftAddress,
        uint256 tokenId,
        address seller,
        uint256 price
    ) private {
        uint256 remaining = price;
        
        // try to pay royalties if NFT supports it
        try ArcNFT(nftAddress).calculateRoyalty(tokenId, price) returns (
            address creator,
            uint256 royaltyAmount
        ) {
            // only pay royalty if creator is different from seller and amount > 0
            if (creator != address(0) && creator != seller && royaltyAmount > 0) {
                (bool success, ) = payable(creator).call{value: royaltyAmount}("");
                require(success, "Royalty payment failed");
                remaining -= royaltyAmount;
            }
        } catch {
            // NFT doesnt support royalties, skip
        }
        
        // calculate and pay platform fee
        uint256 fee = (price * platformFee) / 10000;
        if (fee > 0) {
            (bool success, ) = payable(owner()).call{value: fee}("");
            require(success, "Fee payment failed");
            remaining -= fee;
        }
        
        // rest goes to seller
        (bool success, ) = payable(seller).call{value: remaining}("");
        require(success, "Seller payment failed");
    }
    
    /**
     * @dev Update platform fee - only owner
     * Max 10% to prevent abuse
     */
    function setPlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= MAX_PLATFORM_FEE, "Fee too high"); 
        platformFee = newFee;
    }
    
    /**
     * @dev Returns listing information
     */
    function getListing(address nftAddress, uint256 tokenId)
        public
        view
        returns (Listing memory)
    {
        return listings[nftAddress][tokenId];
    }
    
    /**
     * @dev Returns offer information
     */
    function getOffer(address nftAddress, uint256 tokenId, address buyer)
        public
        view
        returns (Offer memory)
    {
        return offers[nftAddress][tokenId][buyer];
    }
    
    /**
     * @dev Returns auction information
     */
    function getAuction(address nftAddress, uint256 tokenId)
        public
        view
        returns (Auction memory)
    {
        return auctions[nftAddress][tokenId];
    }
}
