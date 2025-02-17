// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupervisedDAO
 * @dev This contract implements a Decentralized Autonomous Organization (DAO) with a supervisor role.
 * The supervisor can veto proposals and transfer supervisor rights to a new address.
 */
contract SupervisedDAO {
    struct Proposal {
        uint id;
        string description;
        uint votingDeadline;
        uint yesVotes;
        uint noVotes;
        bool executed;
        mapping(address => bool) votes;
    }

    mapping(uint => Proposal) public proposals;
    uint public proposalCount;

    address public supervisor;
    mapping(address => bool) public members;
    uint public minimumQuorum;
    uint public debatingPeriodDuration;

    event ProposalCreated(uint id, string description, uint votingDeadline);
    event VotedOn(uint id, bool vote, address voter);
    event ProposalExecuted(uint id);
    event SupervisorChanged(address newSupervisor);

    modifier onlySupervisor() {
        require(msg.sender == supervisor, "Only the supervisor can perform this action.");
        _;
    }

    modifier onlyMembers() {
        require(members[msg.sender], "Only members can perform this action.");
        _;
    }

    constructor(
        address[] memory _members,
        uint _minimumQuorum,
        uint _debatingPeriodDuration,
        address _supervisor
    ) {
        supervisor = _supervisor;
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;

        for (uint i = 0; i < _members.length; i++) {
            members[_members[i]] = true;
        }
    }

    function createProposal(string memory _description) public onlyMembers {
        Proposal storage proposal = proposals[proposalCount];
        proposal.id = proposalCount;
        proposal.description = _description;
        proposal.votingDeadline = block.timestamp + debatingPeriodDuration;

        emit ProposalCreated(proposalCount, _description, proposal.votingDeadline);
        proposalCount++;
    }

    function voteOnProposal(uint _id, bool _vote) public onlyMembers {
        Proposal storage proposal = proposals[_id];
        require(block.timestamp < proposal.votingDeadline, "Voting deadline has passed.");
        require(!proposal.votes[msg.sender], "You have already voted on this proposal.");

        if (_vote) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        proposal.votes[msg.sender] = true;
        emit VotedOn(_id, _vote, msg.sender);
    }

    function executeProposal(uint _id) public onlyMembers {
        Proposal storage proposal = proposals[_id];
        require(block.timestamp >= proposal.votingDeadline, "Voting is still ongoing.");
        require(!proposal.executed, "Proposal has already been executed.");

        uint totalVotes = proposal.yesVotes + proposal.noVotes;
        require(totalVotes >= minimumQuorum, "Minimum quorum was not reached.");
        require(proposal.yesVotes > proposal.noVotes, "Proposal was rejected.");

        proposal.executed = true;
        emit ProposalExecuted(_id);
        // Add your proposal execution logic here
    }

    function vetoProposal(uint _id) public onlySupervisor {
        Proposal storage proposal = proposals[_id];
        require(!proposal.executed, "Proposal has already been executed.");

        proposal.yesVotes = 0;
        proposal.noVotes = 0;
        proposal.executed = true;
        // Add your veto execution logic here
    }

    function transferSupervisor(address _newSupervisor) public onlySupervisor {
        supervisor = _newSupervisor;
        emit SupervisorChanged(_newSupervisor);
    }
}